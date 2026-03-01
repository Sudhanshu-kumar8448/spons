import { Injectable } from '@nestjs/common';
import type { Event, EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * EventRepository — Prisma data-access layer for the Event entity.
 *
 * All read/write methods are thin wrappers around PrismaClient.
 * The service layer calls these methods; controllers never call the repo directly.
 */
@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get the Prisma client for transactions.
   */
  getPrismaClient(): PrismaService {
    return this.prisma;
  }

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new event.
   */
  async create(data: Prisma.EventCreateInput): Promise<Event> {
    return this.prisma.event.create({ data });
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Find a single event by ID.
   */
  async findById(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { id } });
  }

  /**
   * List events with optional filters and pagination.
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    status?: EventStatus;
    organizerId?: string;
    isActive?: boolean;
  }): Promise<{ data: Event[]; total: number }> {
    const where: Prisma.EventWhereInput = {
      ...(params.status !== undefined && { status: params.status }),
      ...(params.organizerId !== undefined && { organizerId: params.organizerId }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * List events owned by a specific organizer.
   */
  async findByOrganizer(params: {
    organizerId: string;
    skip?: number;
    take?: number;
    status?: EventStatus;
    isActive?: boolean;
  }): Promise<{ data: Event[]; total: number }> {
    const where: Prisma.EventWhereInput = {
      organizerId: params.organizerId,
      ...(params.status !== undefined && { status: params.status }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data, total };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update an event by ID.
   */
  async updateById(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
    return this.prisma.event.update({
      where: { id },
      data,
    });
  }
}
