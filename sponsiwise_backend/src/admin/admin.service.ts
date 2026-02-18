import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
import { UserRepository, type SafeUser } from '../users/user.repository';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AdminUsersQueryDto, AssignableRole, UserStatusValue } from './dto';

/**
 * AdminService — business logic for admin-scoped APIs.
 *
 * Role rules:
 *  - ADMIN  → tenant-scoped (own tenant only)
 *  - SUPER_ADMIN → cross-tenant (all tenants)
 *
 * Safety invariants enforced at this layer:
 *  1. SUPER_ADMIN role can never be assigned
 *  2. No user can modify their own role
 *  3. No user can deactivate themselves
 *  4. ADMIN cannot touch users outside their tenant
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Dashboard stats ──────────────────────────────────────────────────

  async getDashboardStats(actorRole: Role, tenantId: string) {
    const isSuperAdmin = actorRole === Role.SUPER_ADMIN;
    const tenantFilter = isSuperAdmin ? {} : { tenantId };

    // All counts in parallel
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRoleRaw,
      totalCompanies,
      totalEvents,
      totalProposals,
      totalSponsorships,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.user.count({ where: tenantFilter }),
      this.prisma.user.count({ where: { ...tenantFilter, isActive: true } }),
      this.prisma.user.count({ where: { ...tenantFilter, isActive: false } }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: tenantFilter,
        _count: { role: true },
      }),
      this.prisma.company.count({ where: tenantFilter }),
      this.prisma.event.count({ where: tenantFilter }),
      this.prisma.proposal.count({ where: tenantFilter }),
      this.prisma.sponsorship.count({ where: tenantFilter }),
      this.prisma.user.count({
        where: {
          ...tenantFilter,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Build users_by_role map with zeros for all known roles
    const users_by_role: Record<string, number> = {
      USER: 0,
      SPONSOR: 0,
      ORGANIZER: 0,
      MANAGER: 0,
      ADMIN: 0,
      SUPER_ADMIN: 0,
    };
    for (const entry of usersByRoleRaw) {
      users_by_role[entry.role] = entry._count.role;
    }

    // Build signup_trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const signupTrendRaw = await this.prisma.user.findMany({
      where: {
        ...tenantFilter,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const trendMap = new Map<string, number>();
    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      trendMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const u of signupTrendRaw) {
      const day = u.createdAt.toISOString().slice(0, 10);
      trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
    }
    const signup_trend = Array.from(trendMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      total_users: totalUsers,
      active_users: activeUsers,
      inactive_users: inactiveUsers,
      users_by_role,
      total_companies: totalCompanies,
      total_events: totalEvents,
      total_proposals: totalProposals,
      total_sponsorships: totalSponsorships,
      recent_registrations: recentRegistrations,
      signup_trend,
    };
  }

  // ─── List users ───────────────────────────────────────────────────────

  async getUsers(actorRole: Role, tenantId: string, query: AdminUsersQueryDto) {
    const isSuperAdmin = actorRole === Role.SUPER_ADMIN;
    const skip = (query.page - 1) * query.page_size;
    const take = query.page_size;

    // Map status string to boolean
    let isActive: boolean | undefined;
    if (query.status === 'active') isActive = true;
    else if (query.status === 'inactive') isActive = false;

    // Role filter
    const roleFilter = query.role ? (query.role.toUpperCase() as Role) : undefined;

    if (isSuperAdmin) {
      // Cross-tenant: use findAll
      const result = await this.userRepository.findAll({
        skip,
        take,
        role: roleFilter,
        isActive,
      });

      return {
        data: result.data.map((u) => this.mapUserToResponse(u)),
        total: result.total,
        page: query.page,
        page_size: query.page_size,
      };
    }

    // ADMIN: tenant-scoped
    const result = await this.userRepository.findByTenant({
      tenantId,
      skip,
      take,
      role: roleFilter,
      isActive,
    });

    return {
      data: result.data.map((u) => this.mapUserToResponse(u)),
      total: result.total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  // ─── Get single user ─────────────────────────────────────────────────

  async getUserById(actorRole: Role, tenantId: string, userId: string) {
    const user = await this.resolveUser(actorRole, tenantId, userId);
    return this.mapUserToDetailResponse(user);
  }

  // ─── Update role ──────────────────────────────────────────────────────

  async updateRole(
    actorId: string,
    actorRole: Role,
    tenantId: string,
    targetUserId: string,
    newRole: AssignableRole,
  ) {
    // 1. Guard: SUPER_ADMIN can never be assigned (defence-in-depth;
    //    the DTO enum already excludes it, but we double-check at runtime)
    if ((newRole as string) === Role.SUPER_ADMIN) {
      throw new BadRequestException('Cannot assign SUPER_ADMIN role');
    }

    // 2. Guard: No user may change their own role
    if (actorId === targetUserId) {
      throw new BadRequestException('Cannot modify your own role');
    }

    // 3. Resolve target user (respects tenant scoping)
    const target = await this.resolveUser(actorRole, tenantId, targetUserId);

    // 4. Guard: Cannot modify a SUPER_ADMIN's role
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot modify a SUPER_ADMIN user');
    }

    const previousRole = target.role;

    // 5. Perform the update
    const isSuperAdmin = actorRole === Role.SUPER_ADMIN;
    const updated = isSuperAdmin
      ? await this.userRepository.updateById(targetUserId, {
          role: newRole as unknown as Role,
        })
      : await this.userRepository.updateByIdAndTenant(targetUserId, tenantId, {
          role: newRole as unknown as Role,
        });

    // 6. Audit log
    await this.auditLogService.log({
      tenantId: target.tenantId,
      actorId,
      actorRole,
      action: 'user.role_changed',
      entityType: 'User',
      entityId: targetUserId,
      metadata: { previousRole, newRole },
    });

    this.logger.log(
      `Role changed: User ${targetUserId} ${previousRole} → ${newRole} by ${actorId}`,
    );

    return this.mapUserToDetailResponse(updated);
  }

  // ─── Update status ────────────────────────────────────────────────────

  async updateStatus(
    actorId: string,
    actorRole: Role,
    tenantId: string,
    targetUserId: string,
    newStatus: UserStatusValue,
  ) {
    // 1. Guard: No user may deactivate themselves
    if (actorId === targetUserId) {
      throw new BadRequestException('Cannot change your own account status');
    }

    // 2. Resolve target user (respects tenant scoping)
    const target = await this.resolveUser(actorRole, tenantId, targetUserId);

    // 3. Guard: Cannot deactivate a SUPER_ADMIN
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot modify a SUPER_ADMIN user');
    }

    const newIsActive = newStatus === UserStatusValue.ACTIVE;
    const previousStatus = target.isActive ? 'active' : 'inactive';

    // 4. Perform the update
    const isSuperAdmin = actorRole === Role.SUPER_ADMIN;
    const updated = isSuperAdmin
      ? await this.userRepository.updateById(targetUserId, {
          isActive: newIsActive,
        })
      : await this.userRepository.updateByIdAndTenant(targetUserId, tenantId, {
          isActive: newIsActive,
        });

    // 5. Audit log
    await this.auditLogService.log({
      tenantId: target.tenantId,
      actorId,
      actorRole,
      action: 'user.status_changed',
      entityType: 'User',
      entityId: targetUserId,
      metadata: { previousStatus, newStatus },
    });

    this.logger.log(
      `Status changed: User ${targetUserId} ${previousStatus} → ${newStatus} by ${actorId}`,
    );

    return this.mapUserToDetailResponse(updated);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Resolve a user by ID, enforcing tenant scope for ADMIN and allowing
   * cross-tenant lookups for SUPER_ADMIN.
   */
  private async resolveUser(actorRole: Role, tenantId: string, userId: string): Promise<SafeUser> {
    const isSuperAdmin = actorRole === Role.SUPER_ADMIN;

    const user = isSuperAdmin
      ? await this.userRepository.findById(userId)
      : await this.userRepository.findByIdAndTenant(userId, tenantId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Map a SafeUser to the response shape expected by the frontend list API.
   */
  private mapUserToResponse(user: SafeUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.email.split('@')[0], // derive name from email as fallback
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      avatar_url: null,
      last_login_at: null,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }

  /**
   * Map a SafeUser to the detail response shape expected by the frontend.
   */
  private mapUserToDetailResponse(user: SafeUser) {
    return {
      ...this.mapUserToResponse(user),
      phone: null,
      company_name: null,
      company_id: user.companyId ?? null,
    };
  }
}
