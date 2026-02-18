import { Injectable } from '@nestjs/common';
import type { Proposal, ProposalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * ProposalRepository — Prisma data-access layer for the Proposal entity.
 *
 * All read/write methods are thin wrappers around PrismaClient.
 * The service layer calls these methods; controllers never call the repo directly.
 */
@Injectable()
export class ProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new proposal.
   */
  async create(data: Prisma.ProposalCreateInput): Promise<Proposal> {
    return this.prisma.proposal.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Find a single proposal by ID.
   */
  async findById(id: string): Promise<Proposal | null> {
    return this.prisma.proposal.findUnique({ where: { id } });
  }

  /**
   * Find a single proposal by ID within a specific tenant.
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Proposal | null> {
    return this.prisma.proposal.findFirst({ where: { id, tenantId } });
  }

  /**
   * List proposals for a given sponsorship.
   */
  async findBySponsorshipId(sponsorshipId: string): Promise<Proposal[]> {
    return this.prisma.proposal.findMany({
      where: { sponsorshipId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List proposals within a tenant with optional filters and pagination.
   */
  async findByTenant(params: {
    tenantId: string;
    skip?: number;
    take?: number;
    status?: ProposalStatus;
    sponsorshipId?: string;
    isActive?: boolean;
  }): Promise<{ data: Proposal[]; total: number }> {
    const where: Prisma.ProposalWhereInput = {
      tenantId: params.tenantId,
      ...(params.status !== undefined && { status: params.status }),
      ...(params.sponsorshipId !== undefined && {
        sponsorshipId: params.sponsorshipId,
      }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List all proposals across all tenants (SUPER_ADMIN only).
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    status?: ProposalStatus;
    sponsorshipId?: string;
    isActive?: boolean;
  }): Promise<{ data: Proposal[]; total: number }> {
    const where: Prisma.ProposalWhereInput = {
      ...(params.status !== undefined && { status: params.status }),
      ...(params.sponsorshipId !== undefined && {
        sponsorshipId: params.sponsorshipId,
      }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return { data, total };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a proposal, scoped to a tenant.
   */
  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    data: Prisma.ProposalUpdateInput,
  ): Promise<Proposal> {
    return this.prisma.proposal.update({
      where: { id, tenantId },
      data,
    });
  }

  /**
   * Update a proposal by ID (no tenant scope — SUPER_ADMIN).
   */
  async updateById(id: string, data: Prisma.ProposalUpdateInput): Promise<Proposal> {
    return this.prisma.proposal.update({
      where: { id },
      data,
    });
  }
}
