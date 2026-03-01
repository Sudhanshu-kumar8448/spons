import { Injectable } from '@nestjs/common';
import type { Proposal, ProposalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * ProposalRepository — Prisma data-access layer for the Proposal entity.
 */
@Injectable()
export class ProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────

  async create(data: Prisma.ProposalCreateInput): Promise<Proposal> {
    return this.prisma.proposal.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  async findById(id: string): Promise<Proposal | null> {
    return this.prisma.proposal.findUnique({ where: { id } });
  }

  async findBySponsorshipId(sponsorshipId: string): Promise<Proposal[]> {
    return this.prisma.proposal.findMany({
      where: { sponsorshipId },
      orderBy: { createdAt: 'desc' },
    });
  }

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

  async updateById(id: string, data: Prisma.ProposalUpdateInput): Promise<Proposal> {
    return this.prisma.proposal.update({
      where: { id },
      data,
    });
  }
}
