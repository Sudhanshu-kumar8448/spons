import { Injectable } from '@nestjs/common';
import type { Prisma, Tenant } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * TenantRepository — Prisma data-access layer for the Tenant entity.
 *
 * Keeps raw database queries isolated from business logic.
 * The service layer calls these methods; controllers never call the repo directly.
 */
@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tenant.
   */
  async create(data: Prisma.TenantCreateInput): Promise<Tenant> {
    return this.prisma.tenant.create({ data });
  }

  /**
   * Find a tenant by its UUID.
   */
  async findById(id: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  /**
   * Find a tenant by its unique slug.
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  /**
   * List all tenants with optional pagination.
   */
  async findAll(params: {
    skip?: number;
    take?: number;
  }): Promise<{ data: Tenant[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);

    return { data, total };
  }

  /**
   * Update mutable fields (name, status) of an existing tenant.
   */
  async update(id: string, data: Prisma.TenantUpdateInput): Promise<Tenant> {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }
}
