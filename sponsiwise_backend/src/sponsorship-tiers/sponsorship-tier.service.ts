import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Role, EventStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SponsorshipTierRepository } from './sponsorship-tier.repository';
import { EventRepository } from '../events/event.repository';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { CacheService } from '../common/providers/cache.service';
import { CreateSponsorshipTierDto, UpdateSponsorshipTierDto } from './dto/sponsorship-tier.dto';
import type { SponsorshipTier } from '@prisma/client';

/**
 * SponsorshipTierService — business logic for sponsorship tier management.
 * 
 * Manages inventory of sponsorship slots per event with locking mechanism.
 */
@Injectable()
export class SponsorshipTierService {
  private readonly logger = new Logger(SponsorshipTierService.name);

  constructor(
    private readonly tierRepository: SponsorshipTierRepository,
    private readonly eventRepository: EventRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new sponsorship tier for an event.
   * - ORGANIZER: can create for their own events (if not locked)
   * - MANAGER/ADMIN: can create for any event
   */
  async create(
    eventId: string,
    dto: CreateSponsorshipTierDto,
    callerRole: Role,
    callerTenantId: string,
    callerId: string,
  ): Promise<SponsorshipTier> {
    // Validate event exists and is accessible
    const event = await this.validateEventAccess(eventId, callerRole, callerTenantId);

    // Check if tier is locked
    if (event.status !== EventStatus.DRAFT && event.status !== 'UNDER_MANAGER_REVIEW') {
      throw new ForbiddenException('Cannot add tiers to a locked event. Contact manager to unlock.');
    }

    // Check if tier type already exists for this event
    const existingTiers = await this.tierRepository.findByEventId(eventId);
    const tierExists = existingTiers.some((t: SponsorshipTier) => t.tierType === dto.tierType);
    if (tierExists) {
      throw new BadRequestException(`Tier type ${dto.tierType} already exists for this event`);
    }

    const tier = await this.tierRepository.create({
      tenantId: callerTenantId,
      eventId,
      tierType: dto.tierType,
      askingPrice: dto.askingPrice,
      totalSlots: dto.totalSlots || 1,
      soldSlots: 0,
      isLocked: false,
      isActive: true,
    });

    this.logger.log(`Tier ${tier.id} created for event ${eventId}`);

    // Audit log
    this.auditLogService.log({
      tenantId: callerTenantId,
      actorId: callerId,
      actorRole: callerRole,
      action: 'tier.created',
      entityType: 'SponsorshipTier',
      entityId: tier.id,
      metadata: {
        tierType: dto.tierType,
        askingPrice: dto.askingPrice,
        totalSlots: dto.totalSlots || 1,
      },
    });

    // Invalidate cache
    this.cacheService.delByPattern(`event:${eventId}:tiers:*`);

    return tier;
  }

  /**
   * Create multiple tiers at once
   */
  async createBulk(
    eventId: string,
    dtos: CreateSponsorshipTierDto[],
    callerRole: Role,
    callerTenantId: string,
    callerId: string,
  ): Promise<SponsorshipTier[]> {
    const event = await this.validateEventAccess(eventId, callerRole, callerTenantId);

    if (event.status !== EventStatus.DRAFT && event.status !== 'UNDER_MANAGER_REVIEW') {
      throw new ForbiddenException('Cannot add tiers to a locked event');
    }

    const tiers: SponsorshipTier[] = [];
    
    for (const dto of dtos) {
      const existingTiers = await this.tierRepository.findByEventId(eventId);
      const tierExists = existingTiers.some((t: SponsorshipTier) => t.tierType === dto.tierType);
      
      if (!tierExists) {
        const tier = await this.tierRepository.create({
          tenantId: callerTenantId,
          eventId,
          tierType: dto.tierType,
          askingPrice: dto.askingPrice,
          totalSlots: dto.totalSlots || 1,
          soldSlots: 0,
          isLocked: false,
          isActive: true,
        });
        tiers.push(tier);
      }
    }

    // Audit log
    this.auditLogService.log({
      tenantId: callerTenantId,
      actorId: callerId,
      actorRole: callerRole,
      action: 'tiers.bulk_created',
      entityType: 'Event',
      entityId: eventId,
      metadata: { tierCount: tiers.length },
    });

    this.cacheService.delByPattern(`event:${eventId}:tiers:*`);

    return tiers;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single tier by ID
   */
  async findById(tierId: string, callerRole: Role, callerTenantId: string): Promise<SponsorshipTier> {
    const tier = await this.tierRepository.findById(tierId);

    if (!tier) {
      throw new NotFoundException('Tier not found');
    }

    // Tenant check
    if (callerRole !== Role.SUPER_ADMIN && tier.tenantId !== callerTenantId) {
      throw new ForbiddenException('Access denied');
    }

    return tier;
  }

  /**
   * Get all tiers for an event
   */
  async findByEventId(eventId: string, callerRole: Role, callerTenantId: string): Promise<SponsorshipTier[]> {
    // Validate event access
    await this.validateEventAccess(eventId, callerRole, callerTenantId);

    return this.tierRepository.findByEventId(eventId);
  }

  /**
   * Get available tiers for sponsors (public/event view)
   * Only returns tiers that are locked and have available slots
   */
  async findAvailableForEvent(eventId: string): Promise<SponsorshipTier[]> {
    return this.tierRepository.findAvailableByEventId(eventId) as Promise<SponsorshipTier[]>;
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a tier
   * - ORGANIZER: can only update if event is not locked
   * - MANAGER/ADMIN: can always update
   */
  async update(
    tierId: string,
    dto: UpdateSponsorshipTierDto,
    callerRole: Role,
    callerTenantId: string,
    callerId: string,
  ): Promise<SponsorshipTier> {
    const tierWithEvent = await this.tierRepository.findByIdWithEvent(tierId);

    if (!tierWithEvent) {
      throw new NotFoundException('Tier not found');
    }

    // Check tier ownership
    if (callerRole !== Role.SUPER_ADMIN && tierWithEvent.tenantId !== callerTenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if tier is locked (organizers can't edit locked tiers)
    if (tierWithEvent.isLocked && callerRole === Role.ORGANIZER) {
      throw new ForbiddenException('Cannot edit locked tiers. Contact manager to unlock.');
    }

    // Check if event is locked (organizers can't edit if event is locked)
    if (tierWithEvent.event.status !== EventStatus.DRAFT && tierWithEvent.event.status !== 'UNDER_MANAGER_REVIEW') {
      if (callerRole === Role.ORGANIZER) {
        throw new ForbiddenException('Cannot edit tiers for a locked event');
      }
    }

    const updatedTier = await this.tierRepository.updateById(tierId, {
      ...(dto.askingPrice !== undefined && { askingPrice: dto.askingPrice }),
      ...(dto.totalSlots !== undefined && { totalSlots: dto.totalSlots }),
      ...(dto.isLocked !== undefined && { isLocked: dto.isLocked }),
    });

    this.logger.log(`Tier ${tierId} updated by ${callerRole}`);

    // Audit log
    this.auditLogService.log({
      tenantId: callerTenantId,
      actorId: callerId,
      actorRole: callerRole,
      action: 'tier.updated',
      entityType: 'SponsorshipTier',
      entityId: tierId,
      metadata: { changes: Object.keys(dto) },
    });

    this.cacheService.delByPattern(`event:${tierWithEvent.eventId}:tiers:*`);

    return updatedTier;
  }

  /**
   * Lock all tiers for an event (called when manager approves event)
   */
  async lockAllTiers(
    eventId: string,
    callerRole: Role,
    callerTenantId: string,
    callerId: string,
  ): Promise<any> {
    await this.validateEventAccess(eventId, callerRole, callerTenantId);

    const result = await this.tierRepository.updateByEventId(eventId, { isLocked: true });

    this.logger.log(`All tiers locked for event ${eventId}`);

    // Audit log
    this.auditLogService.log({
      tenantId: callerTenantId,
      actorId: callerId,
      actorRole: callerRole,
      action: 'tiers.locked',
      entityType: 'Event',
      entityId: eventId,
      metadata: { count: result.count },
    });

    this.cacheService.delByPattern(`event:${eventId}:tiers:*`);
  }

  /**
   * Unlock all tiers for an event (manager only)
   */
  async unlockAllTiers(
    eventId: string,
    callerRole: Role,
    callerTenantId: string,
    callerId: string,
  ): Promise<void> {
    if (callerRole !== Role.ADMIN && callerRole !== Role.MANAGER && callerRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only managers can unlock tiers');
    }

    await this.validateEventAccess(eventId, callerRole, callerTenantId);

    const result = await this.tierRepository.updateByEventId(eventId, { isLocked: false });

    this.logger.log(`All tiers unlocked for event ${eventId}`);

    // Audit log
    this.auditLogService.log({
      tenantId: callerTenantId,
      actorId: callerId,
      actorRole: callerRole,
      action: 'tiers.unlocked',
      entityType: 'Event',
      entityId: eventId,
      metadata: { count: result.count },
    });

    this.cacheService.delByPattern(`event:${eventId}:tiers:*`);
  }

  // ─── DELETE ──────────────────────────────────────────────

  /**
   * Delete a tier
   */
  async delete(
    tierId: string,
    callerRole: Role,
    callerTenantId: string,
    callerId: string,
  ): Promise<void> {
    const tierWithEvent = await this.tierRepository.findByIdWithEvent(tierId);

    if (!tierWithEvent) {
      throw new NotFoundException('Tier not found');
    }

    // Check ownership
    if (callerRole !== Role.SUPER_ADMIN && tierWithEvent.tenantId !== callerTenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Can't delete if tier has sold slots
    if (tierWithEvent.soldSlots > 0) {
      throw new BadRequestException('Cannot delete a tier that has sold slots');
    }

    // Can't delete if tier is locked
    if (tierWithEvent.isLocked) {
      throw new ForbiddenException('Cannot delete a locked tier');
    }

    await this.tierRepository.deleteById(tierId);

    // Audit log
    this.auditLogService.log({
      tenantId: callerTenantId,
      actorId: callerId,
      actorRole: callerRole,
      action: 'tier.deleted',
      entityType: 'SponsorshipTier',
      entityId: tierId,
      metadata: { tierType: tierWithEvent.tierType },
    });

    this.cacheService.delByPattern(`event:${tierWithEvent.eventId}:tiers:*`);
  }

  // ─── INVENTORY MANAGEMENT ─────────────────────────────────

  /**
   * Increment sold slots (called when proposal is approved)
   * Uses atomic operation to prevent race conditions
   */
  async incrementSoldSlots(tierId: string): Promise<boolean> {
    const result = await this.tierRepository.incrementSoldSlots(tierId);
    return result > 0;
  }

  /**
   * Decrement sold slots (called when sponsorship is cancelled)
   */
  async decrementSoldSlots(tierId: string): Promise<void> {
    await this.tierRepository.decrementSoldSlots(tierId);
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────

  private async validateEventAccess(eventId: string, callerRole: Role, callerTenantId: string) {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // For non-super-admins, the event must be in the caller's tenant
    if (callerRole !== Role.SUPER_ADMIN && event.tenantId !== callerTenantId) {
      throw new ForbiddenException('Cannot access events outside your tenant');
    }

    return event;
  }
}

