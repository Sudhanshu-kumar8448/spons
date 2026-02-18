import { Injectable } from '@nestjs/common';
import type { Sponsorship, SponsorshipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * SponsorshipRepository — Prisma data-access layer for the Sponsorship entity.
 *
 * All read/write methods are thin wrappers around PrismaClient.
 * The service layer calls these methods; controllers never call the repo directly.
 */
@Injectable()
export class SponsorshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new sponsorship.
   */
  async create(data: Prisma.SponsorshipCreateInput): Promise<Sponsorship> {
    return this.prisma.sponsorship.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Find a single sponsorship by ID.
   */
  async findById(id: string): Promise<Sponsorship | null> {
    return this.prisma.sponsorship.findUnique({ where: { id } });
  }

  /**
   * Find a single sponsorship by ID within a specific tenant.
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Sponsorship | null> {
    return this.prisma.sponsorship.findFirst({ where: { id, tenantId } });
  }

  /**
   * Check if a sponsorship already exists for a company–event pair.
   */
  async findByCompanyAndEvent(companyId: string, eventId: string): Promise<Sponsorship | null> {
    return this.prisma.sponsorship.findUnique({
      where: { companyId_eventId: { companyId, eventId } },
    });
  }

  /**
   * List sponsorships within a tenant with optional filters and pagination.
   */
  async findByTenant(params: {
    tenantId: string;
    skip?: number;
    take?: number;
    status?: SponsorshipStatus;
    companyId?: string;
    eventId?: string;
    isActive?: boolean;
  }): Promise<{ data: Sponsorship[]; total: number }> {
    const where: Prisma.SponsorshipWhereInput = {
      tenantId: params.tenantId,
      ...(params.status !== undefined && { status: params.status }),
      ...(params.companyId !== undefined && { companyId: params.companyId }),
      ...(params.eventId !== undefined && { eventId: params.eventId }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.sponsorship.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sponsorship.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List all sponsorships across all tenants (SUPER_ADMIN only).
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    status?: SponsorshipStatus;
    companyId?: string;
    eventId?: string;
    isActive?: boolean;
  }): Promise<{ data: Sponsorship[]; total: number }> {
    const where: Prisma.SponsorshipWhereInput = {
      ...(params.status !== undefined && { status: params.status }),
      ...(params.companyId !== undefined && { companyId: params.companyId }),
      ...(params.eventId !== undefined && { eventId: params.eventId }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.sponsorship.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sponsorship.count({ where }),
    ]);

    return { data, total };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a sponsorship, scoped to a tenant.
   */
  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    data: Prisma.SponsorshipUpdateInput,
  ): Promise<Sponsorship> {
    return this.prisma.sponsorship.update({
      where: { id, tenantId },
      data,
    });
  }

  /**
   * Update a sponsorship by ID (no tenant scope — SUPER_ADMIN).
   */
  async updateById(id: string, data: Prisma.SponsorshipUpdateInput): Promise<Sponsorship> {
    return this.prisma.sponsorship.update({
      where: { id },
      data,
    });
  }
}
