import { Injectable } from '@nestjs/common';
import type { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * Safe user type — User without the password field.
 * All repository methods return this shape unless raw User is explicitly needed.
 */
export type SafeUser = Omit<User, 'password'>;

/** Fields to select when returning safe user objects. */
const SAFE_USER_SELECT = {
  id: true,
  tenantId: true,
  companyId: true,
  organizerId: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/**
 * UserRepository — Prisma data-access layer for the User entity.
 *
 * All read methods exclude password by default.
 * The service layer calls these methods; controllers never call the repo directly.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a single user by ID (password excluded).
   */
  async findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * Find a single user by ID within a specific tenant (password excluded).
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<SafeUser | null> {
    return this.prisma.user.findFirst({
      where: { id, tenantId },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * List users within a tenant with optional filters and pagination.
   */
  async findByTenant(params: {
    tenantId: string;
    skip?: number;
    take?: number;
    role?: Role;
    isActive?: boolean;
  }): Promise<{ data: SafeUser[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      tenantId: params.tenantId,
      ...(params.role !== undefined && { role: params.role }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List all users across all tenants (SUPER_ADMIN only).
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    role?: Role;
    isActive?: boolean;
  }): Promise<{ data: SafeUser[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(params.role !== undefined && { role: params.role }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update a user, scoped to a tenant.
   */
  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    data: Prisma.UserUpdateInput,
  ): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id, tenantId },
      data,
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * Update a user by ID (no tenant scope — SUPER_ADMIN).
   */
  async updateById(id: string, data: Prisma.UserUpdateInput): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: SAFE_USER_SELECT,
    });
  }
}
