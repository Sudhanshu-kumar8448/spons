import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UserRepository } from './user.repository';
import type { SafeUser } from './user.repository';
import { UpdateUserDto, ListUsersQueryDto } from './dto';

/**
 * UserService — business logic for user management.
 *
 * Rules:
 *  - Users belong to exactly one tenant (tenantId immutable)
 *  - ADMIN can manage users within their own tenant
 *  - SUPER_ADMIN can manage users across all tenants
 *  - No cross-tenant access for non-super-admins
 *  - ADMIN cannot escalate to SUPER_ADMIN
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get the authenticated user's own profile.
   */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get a single user by ID.
   * - ADMIN: must be within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async findById(
    targetUserId: string,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<SafeUser> {
    let user: SafeUser | null;

    if (callerRole === Role.SUPER_ADMIN) {
      user = await this.userRepository.findById(targetUserId);
    } else {
      user = await this.userRepository.findByIdAndTenant(targetUserId, callerTenantId);
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * List users.
   * - ADMIN: scoped to their own tenant
   * - SUPER_ADMIN: across all tenants
   */
  async findAll(
    query: ListUsersQueryDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<{
    data: SafeUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    let result: { data: SafeUser[]; total: number };

    if (callerRole === Role.SUPER_ADMIN) {
      result = await this.userRepository.findAll({
        skip,
        take: limit,
        role: query.role,
        isActive: query.isActive,
      });
    } else {
      result = await this.userRepository.findByTenant({
        tenantId: callerTenantId,
        skip,
        take: limit,
        role: query.role,
        isActive: query.isActive,
      });
    }

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a user.
   * - ADMIN: within their own tenant; cannot set SUPER_ADMIN role
   * - SUPER_ADMIN: any tenant, any role
   */
  async update(
    targetUserId: string,
    dto: UpdateUserDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<SafeUser> {
    // Prevent ADMIN from escalating to SUPER_ADMIN
    if (callerRole !== Role.SUPER_ADMIN && dto.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can assign SUPER_ADMIN role');
    }

    // Ensure target user exists (and is within tenant for ADMIN)
    await this.findById(targetUserId, callerRole, callerTenantId);

    let user: SafeUser;

    const data = {
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    if (callerRole === Role.SUPER_ADMIN) {
      user = await this.userRepository.updateById(targetUserId, data);
    } else {
      user = await this.userRepository.updateByIdAndTenant(targetUserId, callerTenantId, data);
    }

    this.logger.log(`User ${targetUserId} updated by ${callerRole} (tenant: ${callerTenantId})`);
    return user;
  }
}
