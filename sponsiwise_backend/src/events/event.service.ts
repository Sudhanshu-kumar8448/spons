import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Event, Prisma } from '@prisma/client';
import { Role, TierType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventRepository } from './event.repository';
import { OrganizerRepository } from '../organizers/organizer.repository';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { CacheService } from '../common/providers/cache.service';
import {
  EventVerifiedEvent,
  EVENT_VERIFIED_EVENT,
  EventRejectedEvent,
  EVENT_REJECTED_EVENT,
} from '../common/events';
import {  ListEventsQueryDto } from './dto';

/**
 * EventService — business logic for event management.
 */
@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly organizerRepository: OrganizerRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) { }

 

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single event by ID.
   */
  async findById(eventId: string): Promise<Event> {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  /**
   * List events with optional filters.
   */
  async findAll(
    query: ListEventsQueryDto,
  ): Promise<{
    data: Event[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build a deterministic cache key from query params
    const cacheKey = CacheService.key(
      'events',
      'list',
      `p${page}`,
      `l${limit}`,
      `s${query.status ?? 'any'}`,
      `o${query.organizerId ?? 'any'}`,
      `a${query.isActive ?? 'any'}`,
    );

    // Try cache first
    const cached = await this.cacheService.get<{ data: Event[]; total: number }>(cacheKey);
    if (cached) {
      return { ...cached, page, limit };
    }

    const result = await this.eventRepository.findAll({
      skip,
      take: limit,
      status: query.status,
      organizerId: query.organizerId,
      isActive: query.isActive,
    });

    // Populate cache (60s TTL)
    this.cacheService.set(cacheKey, result, 60);

    return { ...result, page, limit };
  }

   // ─── VERIFICATION ────────────────────────────────────────

  /**
   * Verify an event.
   * Activates the event and emits an EventVerifiedEvent.
   */
  async verify(
    eventId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerNotes?: string,
  ): Promise<Event> {
    await this.findById(eventId);

    const event = await this.eventRepository.updateById(eventId, {
      isActive: true,
      approvedBy: { connect: { id: reviewerId } },
      approvedAt: new Date(),
    });

    this.logger.log(`Event ${eventId} verified by ${reviewerRole}:${reviewerId}`);

    this.auditLogService.log({
      actorId: reviewerId,
      actorRole: reviewerRole,
      action: 'event.verified',
      entityType: 'Event',
      entityId: eventId,
      metadata: {
        decision: 'VERIFIED',
        reviewerNotes: reviewerNotes ?? null,
      },
    });

    this.eventEmitter.emit(
      EVENT_VERIFIED_EVENT,
      new EventVerifiedEvent({
        entityId: eventId,
        reviewerId,
        reviewerRole,
        reviewerNotes,
      }),
    );

    // Invalidate event list caches
    this.cacheService.delByPattern('events:list:*');

    return event;
  }

  /**
   * Reject an event.
   * Deactivates the event and emits an EventRejectedEvent.
   */
  async reject(
    eventId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerNotes?: string,
  ): Promise<Event> {
    await this.findById(eventId);

    const event = await this.eventRepository.updateById(eventId, {
      isActive: false,
      rejectionReason: reviewerNotes ?? null,
      approvedBy: { connect: { id: reviewerId } },
      approvedAt: new Date(),
    });

    this.logger.log(`Event ${eventId} rejected by ${reviewerRole}:${reviewerId}`);

    this.auditLogService.log({
      actorId: reviewerId,
      actorRole: reviewerRole,
      action: 'event.rejected',
      entityType: 'Event',
      entityId: eventId,
      metadata: {
        decision: 'REJECTED',
        reviewerNotes: reviewerNotes ?? null,
      },
    });

    this.eventEmitter.emit(
      EVENT_REJECTED_EVENT,
      new EventRejectedEvent({
        entityId: eventId,
        reviewerId,
        reviewerRole,
        reviewerNotes,
      }),
    );

    // Invalidate event list caches
    this.cacheService.delByPattern('events:list:*');

    return event;
  }

  // ─── DELETE (Soft) ───────────────────────────────────────

  /**
   * Soft delete an event (set isActive = false).
   */
  async remove(eventId: string): Promise<Event> {
    await this.findById(eventId);

    const event = await this.eventRepository.updateById(eventId, { isActive: false });

    this.logger.log(`Event ${eventId} soft-deleted`);

    // Invalidate caches
    this.cacheService.delByPattern('events:list:*');

    return event;
  }
}
