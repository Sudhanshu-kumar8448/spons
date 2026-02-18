import { Injectable } from '@nestjs/common';
import type { Company, CompanyType, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * CompanyRepository — Prisma data-access layer for the Company entity.
 *
 * All read/write methods are thin wrappers around PrismaClient.
 * The service layer calls these methods; controllers never call the repo directly.
 */
@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new company.
   */
  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Find a single company by ID.
   */
  async findById(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }

  /**
   * Find a single company by ID within a specific tenant.
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Company | null> {
    return this.prisma.company.findFirst({ where: { id, tenantId } });
  }

  /**
   * List companies within a tenant with optional filters and pagination.
   */
  async findByTenant(params: {
    tenantId: string;
    skip?: number;
    take?: number;
    type?: CompanyType;
    isActive?: boolean;
  }): Promise<{ data: Company[]; total: number }> {
    const where: Prisma.CompanyWhereInput = {
      tenantId: params.tenantId,
      ...(params.type !== undefined && { type: params.type }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List all companies across all tenants (SUPER_ADMIN only).
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    type?: CompanyType;
    isActive?: boolean;
  }): Promise<{ data: Company[]; total: number }> {
    const where: Prisma.CompanyWhereInput = {
      ...(params.type !== undefined && { type: params.type }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { data, total };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a company, scoped to a tenant.
   */
  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    data: Prisma.CompanyUpdateInput,
  ): Promise<Company> {
    return this.prisma.company.update({
      where: { id, tenantId },
      data,
    });
  }

  /**
   * Update a company by ID (no tenant scope — SUPER_ADMIN).
   */
  async updateById(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }
}
