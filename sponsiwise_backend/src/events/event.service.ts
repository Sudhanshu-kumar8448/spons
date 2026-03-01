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
import { CreateEventDto, UpdateEventDto, ListEventsQueryDto } from './dto';

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

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new event with tiers and address using a transaction.
   */
  async create(dto: CreateEventDto): Promise<Event> {
    // Validate organizerId is provided
    if (!dto.organizerId) {
      throw new BadRequestException('organizerId is required');
    }

    // Validate the organizer exists
    const organizer = await this.resolveAndValidateOrganizer(dto.organizerId);

    // Validate date range
    if (!dto.startDate || !dto.endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    this.validateDateRange(dto.startDate, dto.endDate);

    // Validate tiers if provided
    const tiers = dto.tiers ?? [];
    if (tiers.length === 0) {
      throw new BadRequestException('At least one sponsorship tier is required');
    }

    // Validate predefined tier uniqueness (service layer enforcement)
    this.validatePredefinedTierUniqueness(tiers);

    // Validate address if provided
    if (dto.address) {
      this.validateAddress(dto.address);
    }

    // Get Prisma client for transaction
    const prisma = this.eventRepository.getPrismaClient();

    // Create event with tiers and address in a transaction
    const event = await prisma.$transaction(async (tx) => {
      // Create the event
      const eventData: Prisma.EventCreateInput = {
        title: dto.title!,
        ...(dto.description !== undefined && { description: dto.description }),
        expectedFootfall: dto.expectedFootfall ?? 0,
        startDate: new Date(dto.startDate!),
        endDate: new Date(dto.endDate!),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.website !== undefined && { website: dto.website }),
        category: dto.category,
        ...(dto.pptDeckUrl !== undefined && { pptDeckUrl: dto.pptDeckUrl }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        organizer: { connect: { id: organizer.id } },
      };

      const event = await tx.event.create({
        data: eventData,
      });

      // Create address if provided
      if (dto.address) {
        await tx.address.create({
          data: {
            eventId: event.id,
            addressLine1: dto.address.addressLine1,
            addressLine2: dto.address.addressLine2,
            city: dto.address.city,
            state: dto.address.state,
            country: dto.address.country,
            postalCode: dto.address.postalCode,
          },
        });
      }

      // Create tiers
      for (const tier of tiers) {
        const tierType = tier.tierType as TierType;
        const benefitsJson = JSON.stringify(tier.benefits ?? []);
        
        await tx.sponsorshipTier.create({
          data: {
            eventId: event.id,
            tierType: tierType,
            ...(tierType === TierType.CUSTOM && tier.customName && { customName: tier.customName }),
            askingPrice: tier.askingPrice,
            totalSlots: tier.totalSlots ?? 1,
            soldSlots: 0,
            isLocked: false,
            isActive: true,
            benefits: benefitsJson,
            ...(tier.id && { id: tier.id }), // For updates
          },
        });
      }

      return event;
    });

    this.logger.log(
      `Event ${event.id} created for organizer ${organizer.id} with ${tiers.length} tiers`,
    );

    // Invalidate event list caches
    this.cacheService.delByPattern('events:list:*');

    return event;
  }

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

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update an event.
   */
  async update(
    eventId: string,
    dto: UpdateEventDto,
  ): Promise<Event> {
    const existing = await this.findById(eventId);

    // Validate date range if either date is being updated
    const startDate = dto.startDate ?? existing.startDate.toISOString();
    const endDate = dto.endDate ?? existing.endDate.toISOString();
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      this.validateDateRange(startDate, endDate);
    }

    const data = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.expectedFootfall !== undefined && { expectedFootfall: dto.expectedFootfall }),
      ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const event = await this.eventRepository.updateById(eventId, data);

    this.logger.log(`Event ${eventId} updated`);

    // Invalidate event list caches
    this.cacheService.delByPattern('events:list:*');

    return event;
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────

  /**
   * Resolve the organizer and validate it exists.
   *
   * Throws NotFoundException if organizer doesn't exist.
   */
  private async resolveAndValidateOrganizer(organizerId: string) {
    const organizer = await this.organizerRepository.findById(organizerId);

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
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

  /**
   * Validate predefined tier uniqueness.
   * Only one of each predefined tier type (TITLE, PLATINUM, etc.) is allowed per event.
   * CUSTOM tier type can have multiple entries.
   */
  private validatePredefinedTierUniqueness(tiers: CreateEventDto['tiers']): void {
    const predefinedTypes = new Set<string>();
    
    for (const tier of tiers ?? []) {
      if (tier.tierType !== 'CUSTOM') {
        if (predefinedTypes.has(tier.tierType)) {
          throw new BadRequestException(`Duplicate predefined tier: ${tier.tierType}. Only one ${tier.tierType} tier is allowed per event.`);
        }
        predefinedTypes.add(tier.tierType);
      }
    }
  }

  /**
   * Validate required address fields.
   */
  private validateAddress(address: NonNullable<CreateEventDto['address']>): void {
    if (!address.addressLine1) {
      throw new BadRequestException('Address line 1 is required');
    }
    if (!address.city) {
      throw new BadRequestException('City is required');
    }
    if (!address.state) {
      throw new BadRequestException('State is required');
    }
    if (!address.country) {
      throw new BadRequestException('Country is required');
    }
    if (!address.postalCode) {
      throw new BadRequestException('Postal code is required');
    }
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
