import { Injectable } from '@nestjs/common';
import type { Sponsorship, SponsorshipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * SponsorshipRepository — Prisma data-access layer for the Sponsorship entity.
 */
@Injectable()
export class SponsorshipRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────

  async create(data: Prisma.SponsorshipCreateInput): Promise<Sponsorship> {
    return this.prisma.sponsorship.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  async findById(id: string): Promise<Sponsorship | null> {
    return this.prisma.sponsorship.findUnique({ where: { id } });
  }

  async findByCompanyAndEvent(companyId: string, eventId: string): Promise<Sponsorship | null> {
    return this.prisma.sponsorship.findUnique({
      where: { companyId_eventId: { companyId, eventId } },
    });
  }

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

  async updateById(id: string, data: Prisma.SponsorshipUpdateInput): Promise<Sponsorship> {
    return this.prisma.sponsorship.update({
      where: { id },
      data,
    });
  }
}
