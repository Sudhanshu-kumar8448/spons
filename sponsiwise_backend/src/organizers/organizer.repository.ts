import { Injectable } from '@nestjs/common';
import type { Organizer, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * OrganizerRepository — Prisma data-access layer for the Organizer entity.
 *
 * All read/write methods are thin wrappers around PrismaClient.
 * The service layer calls these methods; controllers never call the repo directly.
 */
@Injectable()
export class OrganizerRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new organizer.
   */
  async create(data: Prisma.OrganizerCreateInput): Promise<Organizer> {
    return this.prisma.organizer.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Find a single organizer by ID.
   */
  async findById(id: string): Promise<Organizer | null> {
    return this.prisma.organizer.findUnique({ where: { id } });
  }

  /**
   * List organizers with optional filters and pagination.
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    isActive?: boolean;
  }): Promise<{ data: Organizer[]; total: number }> {
    const where: Prisma.OrganizerWhereInput = {
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.organizer.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organizer.count({ where }),
    ]);

    return { data, total };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update an organizer by ID.
   */
  async updateById(id: string, data: Prisma.OrganizerUpdateInput): Promise<Organizer> {
    return this.prisma.organizer.update({
      where: { id },
      data,
    });
  }
}
