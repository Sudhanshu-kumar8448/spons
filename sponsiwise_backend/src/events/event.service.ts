import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Event } from '@prisma/client';
import { Role } from '@prisma/client';
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
import { CreateEventDto, UpdateEventDto, ListEventsQueryDto } from './dto';

/**
 * EventService — business logic for event management.
 *
 * Rules:
 *  - An event belongs to exactly one Organizer and one Tenant
 *  - tenantId is derived from the Organizer (not from the request body)
 *  - ADMIN can manage all events within their own tenant
 *  - USER  can only view events within their own tenant
 *  - SUPER_ADMIN can view / manage all events across all tenants
 *  - Organizer ownership is enforced for write operations
 *  - No cross-tenant access for non-super-admins
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

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new event.
   * - ADMIN: event is created under an Organizer within their own tenant
   * - SUPER_ADMIN: may create for any Organizer in any tenant
   *
   * The tenantId is always derived from the Organizer to prevent mismatch.
   */
  async create(dto: CreateEventDto, callerRole: Role, callerTenantId: string): Promise<Event> {
    // Validate the organizer exists and is within the caller's tenant
    const organizer = await this.resolveAndValidateOrganizer(
      dto.organizerId,
      callerRole,
      callerTenantId,
    );

    // Validate date range
    this.validateDateRange(dto.startDate, dto.endDate);

    const event = await this.eventRepository.create({
      title: dto.title,
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.venue !== undefined && { venue: dto.venue }),
      expectedFootfall: dto.expectedFootfall,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      tenant: { connect: { id: organizer.tenantId } },
      organizer: { connect: { id: organizer.id } },
    });

    this.logger.log(
      `Event ${event.id} created by ${callerRole} for organizer ${organizer.id} in tenant ${organizer.tenantId}`,
    );

    // Invalidate event list caches for this tenant (+ global for SUPER_ADMIN)
    this.cacheService.delByPattern('events:list:*');

    return event;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single event by ID.
   * - USER / ADMIN: must be within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async findById(eventId: string, callerRole: Role, callerTenantId: string): Promise<Event> {
    let event: Event | null;

    if (callerRole === Role.SUPER_ADMIN) {
      event = await this.eventRepository.findById(eventId);
    } else {
      event = await this.eventRepository.findByIdAndTenant(eventId, callerTenantId);
    }

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  /**
   * List events.
   * - USER / ADMIN: scoped to their own tenant
   * - SUPER_ADMIN: across all tenants
   */
  async findAll(
    query: ListEventsQueryDto,
    callerRole: Role,
    callerTenantId: string,
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
    const scope = callerRole === Role.SUPER_ADMIN ? 'global' : `tenant:${callerTenantId}`;
    const cacheKey = CacheService.key(
      'events',
      'list',
      scope,
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

    let result: { data: Event[]; total: number };

    if (callerRole === Role.SUPER_ADMIN) {
      result = await this.eventRepository.findAll({
        skip,
        take: limit,
        status: query.status,
        organizerId: query.organizerId,
        isActive: query.isActive,
      });
    } else {
      result = await this.eventRepository.findByTenant({
        tenantId: callerTenantId,
        skip,
        take: limit,
        status: query.status,
        organizerId: query.organizerId,
        isActive: query.isActive,
      });
    }

    // Populate cache (60s TTL)
    this.cacheService.set(cacheKey, result, 60);

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update an event.
   * - ADMIN: within their own tenant (any organizer in that tenant)
   * - SUPER_ADMIN: any tenant
   */
  async update(
    eventId: string,
    dto: UpdateEventDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Event> {
    // Ensure the event exists and is within the caller's tenant
    const existing = await this.findById(eventId, callerRole, callerTenantId);

    // Validate date range if either date is being updated
    const startDate = dto.startDate ?? existing.startDate.toISOString();
    const endDate = dto.endDate ?? existing.endDate.toISOString();
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      this.validateDateRange(startDate, endDate);
    }

    const data = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.venue !== undefined && { venue: dto.venue }),
      ...(dto.expectedFootfall !== undefined && { expectedFootfall: dto.expectedFootfall }),
      ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    let event: Event;

    if (callerRole === Role.SUPER_ADMIN) {
      event = await this.eventRepository.updateById(eventId, data);
    } else {
      event = await this.eventRepository.updateByIdAndTenant(eventId, callerTenantId, data);
    }

    this.logger.log(`Event ${eventId} updated by ${callerRole} (tenant: ${callerTenantId})`);

    // Invalidate event list caches
    this.cacheService.delByPattern('events:list:*');

    return event;
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────

  /**
   * Resolve the organizer and validate tenant access.
   * - ADMIN: organizer must belong to the caller's tenant
   * - SUPER_ADMIN: any organizer
   *
   * Throws NotFoundException if organizer doesn't exist.
   * Throws ForbiddenException if cross-tenant access is attempted.
   */
  private async resolveAndValidateOrganizer(
    organizerId: string,
    callerRole: Role,
    callerTenantId: string,
  ) {
    const organizer = await this.organizerRepository.findById(organizerId);

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    // For non-super-admins, the organizer MUST belong to the caller's tenant
    if (callerRole !== Role.SUPER_ADMIN && organizer.tenantId !== callerTenantId) {
      throw new ForbiddenException('Cannot create events for an organizer outside your tenant');
    }

    return organizer;
  }

  /**
   * Validate that endDate is after startDate.
   */
  private validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  // ─── VERIFICATION ────────────────────────────────────────

  /**
   * Verify an event.
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   *
   * Activates the event and emits an EventVerifiedEvent.
   */
  async verify(
    eventId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerTenantId: string,
    reviewerNotes?: string,
  ): Promise<Event> {
    const existing = await this.findById(eventId, reviewerRole, reviewerTenantId);

    const event =
      reviewerRole === Role.SUPER_ADMIN
        ? await this.eventRepository.updateById(eventId, { isActive: true })
        : await this.eventRepository.updateByIdAndTenant(eventId, reviewerTenantId, {
          isActive: true,
        });

    this.logger.log(
      `Event ${eventId} verified by ${reviewerRole}:${reviewerId} (tenant: ${existing.tenantId})`,
    );

    // Audit log — immutable record of the decision
    this.auditLogService.log({
      tenantId: existing.tenantId,
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

    // Domain event — after DB write, before return
    this.eventEmitter.emit(
      EVENT_VERIFIED_EVENT,
      new EventVerifiedEvent({
        entityId: eventId,
        tenantId: existing.tenantId,
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
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   *
   * Deactivates the event and emits an EventRejectedEvent.
   */
  async reject(
    eventId: string,
    reviewerId: string,
    reviewerRole: Role,
    reviewerTenantId: string,
    reviewerNotes?: string,
  ): Promise<Event> {
    const existing = await this.findById(eventId, reviewerRole, reviewerTenantId);

    const event =
      reviewerRole === Role.SUPER_ADMIN
        ? await this.eventRepository.updateById(eventId, { isActive: false })
        : await this.eventRepository.updateByIdAndTenant(eventId, reviewerTenantId, {
          isActive: false,
        });

    this.logger.log(
      `Event ${eventId} rejected by ${reviewerRole}:${reviewerId} (tenant: ${existing.tenantId})`,
    );

    // Audit log — immutable record of the decision
    this.auditLogService.log({
      tenantId: existing.tenantId,
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

    // Domain event — after DB write, before return
    this.eventEmitter.emit(
      EVENT_REJECTED_EVENT,
      new EventRejectedEvent({
        entityId: eventId,
        tenantId: existing.tenantId,
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
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async remove(eventId: string, callerRole: Role, callerTenantId: string): Promise<Event> {
    const existing = await this.findById(eventId, callerRole, callerTenantId);

    const event =
      callerRole === Role.SUPER_ADMIN
        ? await this.eventRepository.updateById(eventId, { isActive: false })
        : await this.eventRepository.updateByIdAndTenant(eventId, callerTenantId, {
          isActive: false,
        });

    this.logger.log(`Event ${eventId} soft-deleted by ${callerRole} (tenant: ${callerTenantId})`);

    // Invalidate caches
    this.cacheService.delByPattern('events:list:*');

    return event;
  }
}
