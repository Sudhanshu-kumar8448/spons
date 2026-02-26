import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/providers/prisma.service';

@Injectable()
export class SponsorshipTierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.sponsorshipTier.create({ data });
  }

  async findById(id: string) {
    return this.prisma.sponsorshipTier.findUnique({
      where: { id },
    });
  }

  async findByIdWithEvent(id: string) {
    return this.prisma.sponsorshipTier.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            organizer: true,
          },
        },
      },
    });
  }

  async findByEventId(eventId: string) {
    return this.prisma.sponsorshipTier.findMany({
      where: { eventId },
      orderBy: { askingPrice: 'desc' },
    });
  }

  async findAvailableByEventId(eventId: string) {
    // Use raw query to compare soldSlots < totalSlots
    return this.prisma.$queryRaw`
      SELECT * FROM "sponsorship_tiers"
      WHERE "event_id" = ${eventId}
        AND "is_active" = true
        AND "is_locked" = true
        AND "sold_slots" < "total_slots"
      ORDER BY "asking_price" DESC
    `;
  }

  async findByTenant(tenantId: string, options?: { skip?: number; take?: number }) {
    return this.prisma.sponsorshipTier.findMany({
      where: { tenantId },
      include: {
        event: {
          include: {
            organizer: true,
          },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateById(id: string, data: any) {
    return this.prisma.sponsorshipTier.update({
      where: { id },
      data,
    });
  }

  async updateByEventId(eventId: string, data: any) {
    return this.prisma.sponsorshipTier.updateMany({
      where: { eventId },
      data,
    });
  }

  async deleteById(id: string) {
    return this.prisma.sponsorshipTier.delete({
      where: { id },
    });
  }

  async incrementSoldSlots(id: string) {
    // Atomic increment using raw SQL to prevent race conditions
    const result = await this.prisma.$executeRaw`
      UPDATE "sponsorship_tiers" 
      SET "sold_slots" = "sold_slots" + 1,
          "updated_at" = NOW()
      WHERE id = ${id}
        AND "is_locked" = true
        AND "sold_slots" < "total_slots"
        AND "is_active" = true
    `;
    return result;
  }

  async decrementSoldSlots(id: string) {
    const result = await this.prisma.$executeRaw`
      UPDATE "sponsorship_tiers" 
      SET "sold_slots" = GREATEST("sold_slots" - 1, 0),
          "updated_at" = NOW()
      WHERE id = ${id}
        AND "sold_slots" > 0
    `;
    return result;
  }

  async countByTenant(tenantId: string) {
    return this.prisma.sponsorshipTier.count({
      where: { tenantId },
    });
  }
}

