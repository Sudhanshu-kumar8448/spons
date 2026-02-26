import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VerificationStatus, EventStatus, TierType } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
import {
  CompanyVerifiedEvent,
  CompanyRejectedEvent,
  EventVerifiedEvent,
  EventRejectedEvent,
  COMPANY_VERIFIED_EVENT,
  COMPANY_REJECTED_EVENT,
  EVENT_VERIFIED_EVENT,
  EVENT_REJECTED_EVENT,
} from '../common/events';
import { AuditLogService } from '../audit-logs/audit-log.service';
import type {
  ManagerCompaniesQueryDto,
  ManagerEventsQueryDto,
  ManagerActivityQueryDto,
  VerifyEntityDto,
  UpdateEventTierDto,
  UpdateManagerEventDto,
  ManagerProposalsQueryDto,
  UpdateManagerProposalDto,
} from './dto';

/**
 * ManagerDashboardService — read + write layer for manager-scoped data.
 *
 * Every method requires tenantId (resolved from JWT, never from request).
 * All queries are tenant-scoped.
 */
@Injectable()
export class ManagerDashboardService {
  private readonly logger = new Logger(ManagerDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) { }

  // ─── Dashboard Stats ─────────────────────────────────────

  /**
   * GET /manager/dashboard/stats
   *
   * Returns verification queue counts and basic platform stats.
   * Response matches frontend ManagerDashboardStats interface:
   *   companies_pending, companies_verified, events_pending, events_verified,
   *   total_users, recent_registrations
   */
  async getDashboardStats(tenantId: string) {
    const [
      companiesPending,
      companiesVerified,
      eventsPending,
      eventsVerified,
      totalUsers,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.company.count({
        where: { tenantId, verificationStatus: VerificationStatus.PENDING },
      }),
      this.prisma.company.count({
        where: { tenantId, verificationStatus: VerificationStatus.VERIFIED },
      }),
      this.prisma.event.count({
        where: { tenantId, verificationStatus: VerificationStatus.PENDING },
      }),
      this.prisma.event.count({
        where: { tenantId, verificationStatus: VerificationStatus.VERIFIED },
      }),
      this.prisma.user.count({
        where: { tenantId, isActive: true },
      }),
      // Users registered in the last 7 days
      this.prisma.user.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      companies_pending: companiesPending,
      companies_verified: companiesVerified,
      events_pending: eventsPending,
      events_verified: eventsVerified,
      total_users: totalUsers,
      recent_registrations: recentRegistrations,
    };
  }

  // ─── Companies Verification Queue ────────────────────────

  /**
   * GET /manager/companies
   *
   * Returns paginated companies in the manager's tenant.
   * Default filter: verificationStatus = PENDING.
   * Matches frontend VerifiableCompaniesResponse shape.
   */
  async getCompanies(tenantId: string, query: ManagerCompaniesQueryDto) {
    const { page, page_size, verification_status, search } = query;
    const skip = (page - 1) * page_size;

    // When verification_status is empty/"all" → return all. Otherwise filter by status.
    const statusFilter = verification_status
      ? (verification_status.toUpperCase() as VerificationStatus)
      : undefined;

    const where: any = {
      tenantId,
      ...(statusFilter && { verificationStatus: statusFilter }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          website: true,
          description: true,
          logoUrl: true,
          verificationStatus: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: data.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || c.id,
        email: '', // Company model has no direct email field
        phone: null,
        website: c.website || null,
        logo_url: c.logoUrl || null,
        industry: c.type || null,
        description: c.description || null,
        verification_status: c.verificationStatus.toLowerCase(),
        verification_notes: null,
        verified_at: null,
        owner: {
          id: '',
          email: '',
          name: c.name,
        },
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
      })),
      total,
      page,
      page_size,
    };
  }

  // ─── Company Detail ─────────────────────────────────────

  /**
   * GET /manager/companies/:id
   *
   * Returns single company detail, tenant-scoped.
   */
  async getCompanyById(tenantId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        website: true,
        description: true,
        logoUrl: true,
        verificationStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: { id: true, email: true },
          take: 1,
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    const owner = company.users[0] || { id: '', email: '' };

    return {
      id: company.id,
      name: company.name,
      slug: company.slug || company.id,
      email: owner.email,
      phone: null,
      website: company.website || null,
      logo_url: company.logoUrl || null,
      industry: company.type || null,
      description: company.description || null,
      verification_status: company.verificationStatus.toLowerCase(),
      verification_notes: null,
      verified_at: null,
      owner: {
        id: owner.id,
        email: owner.email,
        name: company.name,
      },
      created_at: company.createdAt.toISOString(),
      updated_at: company.updatedAt.toISOString(),
    };
  }

  // ─── Company Verification Action ────────────────────────

  /**
   * POST /manager/companies/:id/verify
   *
   * Updates a company's verification status and emits domain event.
   */
  async verifyCompany(
    tenantId: string,
    companyId: string,
    dto: VerifyEntityDto,
    reviewerId: string,
    reviewerRole: string,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });

    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    if (company.verificationStatus !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        `Company is already ${company.verificationStatus.toLowerCase()}`,
      );
    }

    const newStatus =
      dto.action === 'verify' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: { verificationStatus: newStatus },
    });

    // Upgrade company owner's role from USER → SPONSOR on verification
    if (dto.action === 'verify') {
      const upgradeResult = await this.prisma.user.updateMany({
        where: { companyId: companyId, role: 'USER' },
        data: { role: 'SPONSOR' },
      });

      if (upgradeResult.count > 0) {
        this.logger.log(
          `Upgraded ${upgradeResult.count} user(s) to SPONSOR role for company ${companyId}`,
        );
      }
    }

    // Emit domain event
    if (dto.action === 'verify') {
      this.eventEmitter.emit(
        COMPANY_VERIFIED_EVENT,
        new CompanyVerifiedEvent({
          entityId: companyId,
          tenantId,
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    } else {
      this.eventEmitter.emit(
        COMPANY_REJECTED_EVENT,
        new CompanyRejectedEvent({
          entityId: companyId,
          tenantId,
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    }

    this.logger.log(`Company ${companyId} ${dto.action}d by ${reviewerId} in tenant ${tenantId}`);

    return {
      id: updated.id,
      name: updated.name,
      verification_status: updated.verificationStatus.toLowerCase(),
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  // ─── Events Verification Queue ───────────────────────────

  /**
   * GET /manager/events
   *
   * Returns paginated events in the manager's tenant.
   * Default filter: verificationStatus = PENDING.
   * Matches frontend VerifiableEventsResponse shape.
   */
  async getEvents(tenantId: string, query: ManagerEventsQueryDto) {
    const { page, page_size, verification_status, search } = query;
    const skip = (page - 1) * page_size;

    const statusFilter = verification_status
      ? (verification_status.toUpperCase() as VerificationStatus)
      : VerificationStatus.PENDING;

    const where: any = {
      tenantId,
      verificationStatus: statusFilter,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          status: true,
          logoUrl: true,
          verificationStatus: true,
          expectedFootfall: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          organizer: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              logoUrl: true,
            },
          },
          address: {
            select: {
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              country: true,
              postalCode: true,
            },
          },
          tiers: {
            where: { isActive: true },
            select: {
              id: true,
              tierType: true,
              customName: true,
              askingPrice: true,
              totalSlots: true,
              soldSlots: true,
              isLocked: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: data.map((e) => {
        // Calculate tier availability
        const totalSlots = e.tiers.reduce((sum: number, t: any) => sum + t.totalSlots, 0);
        const soldSlots = e.tiers.reduce((sum: number, t: any) => sum + t.soldSlots, 0);
        const hasAvailableTiers = e.tiers.some((t: any) => t.soldSlots < t.totalSlots);

        return {
          id: e.id,
          title: e.title,
          slug: e.id,
          description: e.description || '',
          start_date: e.startDate.toISOString(),
          end_date: e.endDate.toISOString(),
          location: e.address ? `${e.address.addressLine1}, ${e.address.city}` : '',
          venue: '',
          image_url: e.logoUrl || null,
          category: e.category || '',
          status: e.status.toLowerCase(),
          verification_status: e.verificationStatus.toLowerCase(),
          verification_notes: null,
          verified_at: null,
          expected_footfall: e.expectedFootfall,
          organizer: {
            id: e.organizer.id,
            name: e.organizer.name,
            email: e.organizer.contactEmail || '',
            logo_url: e.organizer.logoUrl || null,
          },
          tags: [],
          // Tier summary
          sponsorship_tiers_summary: {
            total_tiers: e.tiers.length,
            total_slots: totalSlots,
            sold_slots: soldSlots,
            available_slots: totalSlots - soldSlots,
            has_available_tiers: hasAvailableTiers,
          },
          created_at: e.createdAt.toISOString(),
          updated_at: e.updatedAt.toISOString(),
        };
      }),
      total,
      page,
      page_size,
    };
  }

  // ─── Event Detail ───────────────────────────────────────

  /**
   * GET /manager/events/:id
   *
   * Returns single event detail, tenant-scoped, with sponsorship tiers.
   */
  async getEventById(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        status: true,
        website: true,
        logoUrl: true,
        verificationStatus: true,
        isActive: true,
        expectedFootfall: true,
        category: true,
        contactPhone: true,
        contactEmail: true,
        pptDeckUrl: true,
        createdAt: true,
        updatedAt: true,
        organizer: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
          },
        },
        address: {
          select: {
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            country: true,
            postalCode: true,
          },
        },
        tiers: {
          where: { isActive: true },
          select: {
            id: true,
            tierType: true,
            customName: true,
            askingPrice: true,
            totalSlots: true,
            soldSlots: true,
            isLocked: true,
            isActive: true,
          },
          orderBy: { tierType: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Transform tiers to include availability
    const sponsorshipTiers = event.tiers.map((tier: any) => ({
      id: tier.id,
      tier_type: tier.tierType,
      asking_price: Number(tier.askingPrice),
      total_slots: tier.totalSlots,
      sold_slots: tier.soldSlots,
      available_slots: tier.totalSlots - tier.soldSlots,
      is_locked: tier.isLocked,
      is_active: tier.isActive,
      is_available: tier.soldSlots < tier.totalSlots,
    }));

    return {
      id: event.id,
      title: event.title,
      slug: event.id,
      description: event.description || '',
      start_date: event.startDate.toISOString(),
      end_date: event.endDate.toISOString(),
      location: event.address ? `${event.address.addressLine1}, ${event.address.city}` : '',
      venue: '',
      image_url: event.logoUrl || null,
      website: event.website || null,
      category: event.category || '',
      status: event.status.toLowerCase(),
      verification_status: event.verificationStatus.toLowerCase(),
      verification_notes: null,
      verified_at: null,
      organizer: {
        id: event.organizer.id,
        name: event.organizer.name,
        email: event.organizer.contactEmail || '',
        logo_url: event.organizer.logoUrl || null,
      },
      tags: [],
      expected_footfall: event.expectedFootfall,
      contact_phone: event.contactPhone || null,
      contact_email: event.contactEmail || null,
      ppt_deck_url: event.pptDeckUrl || null,
      address: event.address ? {
        address_line_1: event.address.addressLine1,
        address_line_2: event.address.addressLine2 || '',
        city: event.address.city,
        state: event.address.state,
        country: event.address.country,
        postal_code: event.address.postalCode,
      } : null,
      sponsorship_tiers: sponsorshipTiers,
      created_at: event.createdAt.toISOString(),
      updated_at: event.updatedAt.toISOString(),
    };
  }

  // ─── Event Update Action ──────────────────────────

  /**
   * PATCH /manager/events/:id
   * 
   * Updates an event and its associated address/tiers.
   * Managers can edit all fields, including locked tiers.
   */
  async updateEvent(
    tenantId: string,
    eventId: string,
    dto: UpdateManagerEventDto,
    actorId: string,
    actorRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      include: { address: true, tiers: { where: { isActive: true } } },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Check if dates are valid
    if (dto.startDate || dto.endDate) {
      const start = new Date(dto.startDate || event.startDate);
      const end = new Date(dto.endDate || event.endDate);
      if (end <= start) {
        throw new BadRequestException('endDate must be after startDate');
      }
    }

    const updatedEvent = await this.prisma.$transaction(async (tx) => {
      // 1. Update basic event fields
      const coreData: any = {};
      if (dto.title !== undefined) coreData.title = dto.title;
      if (dto.description !== undefined) coreData.description = dto.description;
      if (dto.startDate !== undefined) coreData.startDate = new Date(dto.startDate);
      if (dto.endDate !== undefined) coreData.endDate = new Date(dto.endDate);
      if (dto.expectedFootfall !== undefined) coreData.expectedFootfall = dto.expectedFootfall;
      if (dto.website !== undefined) coreData.website = dto.website;
      if (dto.logoUrl !== undefined) coreData.logoUrl = dto.logoUrl;
      if (dto.category !== undefined) coreData.category = dto.category;
      if (dto.contactPhone !== undefined) coreData.contactPhone = dto.contactPhone;
      if (dto.contactEmail !== undefined) coreData.contactEmail = dto.contactEmail;
      if (dto.pptDeckUrl !== undefined) coreData.pptDeckUrl = dto.pptDeckUrl;
      if (dto.status !== undefined) coreData.status = dto.status;

      let savedEvent = event;
      if (Object.keys(coreData).length > 0) {
        savedEvent = await tx.event.update({
          where: { id: eventId },
          data: coreData,
        }) as any;
      }

      // 2. Update address
      if (dto.address) {
        if (event.address) {
          await tx.address.update({
            where: { id: event.address.id },
            data: dto.address,
          });
        } else {
          await tx.address.create({
            data: {
              ...dto.address,
              eventId,
              tenantId,
            } as any,
          });
        }
      }

      // 3. Update tiers
      if (dto.tiers) {
        const existingTiersMap = new Map(event.tiers.map(t => [t.id, t]));

        for (const tierDto of dto.tiers) {
          if (tierDto.id && existingTiersMap.has(tierDto.id)) {
            // Update existing tier
            const existing = existingTiersMap.get(tierDto.id)!;
            if (tierDto.totalSlots !== undefined && tierDto.totalSlots < existing.soldSlots) {
              throw new BadRequestException(`Cannot reduce total slots for tier ${existing.tierType} below already sold slots (${existing.soldSlots})`);
            }
            await tx.sponsorshipTier.update({
              where: { id: tierDto.id },
              data: {
                ...(tierDto.askingPrice !== undefined && { askingPrice: tierDto.askingPrice }),
                ...(tierDto.totalSlots !== undefined && { totalSlots: tierDto.totalSlots }),
                ...(tierDto.isLocked !== undefined && { isLocked: tierDto.isLocked }),
              },
            });
            existingTiersMap.delete(tierDto.id);
          } else if (tierDto.tierType && tierDto.askingPrice !== undefined) {
            // Create new tier
            await tx.sponsorshipTier.create({
              data: {
                tenantId,
                eventId,
                tierType: tierDto.tierType as any,
                askingPrice: tierDto.askingPrice,
                totalSlots: tierDto.totalSlots ?? 1,
                soldSlots: 0,
                isLocked: tierDto.isLocked ?? false,
                isActive: true,
              },
            });
          }
        }

        // Soft delete remaining tiers that weren't included in the update payload
        // ONLY if the UI is expected to send ALL active tiers
        for (const [id] of existingTiersMap) {
          await tx.sponsorshipTier.update({
            where: { id },
            data: { isActive: false },
          });
        }
      }

      return savedEvent;
    });

    this.auditLogService.log({
      tenantId,
      actorId,
      actorRole,
      action: 'event.updated',
      entityType: 'Event',
      entityId: eventId,
      metadata: { source: 'manager_dashboard' },
    });

    // Reuse getEventById to return fully hydrated object
    return this.getEventById(tenantId, eventId);
  }

  // ─── Event Verification Action ──────────────────────────

  /**
   * POST /manager/events/:id/verify
   *
   * Updates an event's verification status and emits domain event.
   * When verified, also locks all sponsorship tiers to prevent modification.
   */
  async verifyEvent(
    tenantId: string,
    eventId: string,
    dto: VerifyEntityDto,
    reviewerId: string,
    reviewerRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (event.verificationStatus !== VerificationStatus.PENDING) {
      throw new BadRequestException(`Event is already ${event.verificationStatus.toLowerCase()}`);
    }

    const newStatus =
      dto.action === 'verify' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    // Use transaction to update event and lock tiers atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Update event verification status
      const updated = await tx.event.update({
        where: { id: eventId },
        data: {
          verificationStatus: newStatus,
          // Also update the status field to VERIFIED if verifying
          ...(dto.action === 'verify' && { status: EventStatus.VERIFIED }),
        },
      });

      // If verifying, lock all tiers
      if (dto.action === 'verify') {
        const tierUpdateResult = await tx.sponsorshipTier.updateMany({
          where: { eventId, isActive: true },
          data: { isLocked: true },
        });

        this.logger.log(
          `Locked ${tierUpdateResult.count} tiers for event ${eventId}`,
        );

        // Audit log for tier locking
        this.auditLogService.log({
          tenantId,
          actorId: reviewerId,
          actorRole: reviewerRole,
          action: 'tiers.locked',
          entityType: 'Event',
          entityId: eventId,
          metadata: {
            tierCount: tierUpdateResult.count,
            reason: 'Event verified by manager',
          },
        });
      }

      return updated;
    });

    // Emit domain event
    if (dto.action === 'verify') {
      this.eventEmitter.emit(
        EVENT_VERIFIED_EVENT,
        new EventVerifiedEvent({
          entityId: eventId,
          tenantId,
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    } else {
      this.eventEmitter.emit(
        EVENT_REJECTED_EVENT,
        new EventRejectedEvent({
          entityId: eventId,
          tenantId,
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    }

    // Audit log for event verification
    this.auditLogService.log({
      tenantId,
      actorId: reviewerId,
      actorRole: reviewerRole,
      action: dto.action === 'verify' ? 'event.verified' : 'event.rejected',
      entityType: 'Event',
      entityId: eventId,
      metadata: {
        previousStatus: event.verificationStatus,
        newStatus: newStatus,
        notes: dto.notes,
      },
    });

    this.logger.log(`Event ${eventId} ${dto.action}d by ${reviewerId} in tenant ${tenantId}`);

    return {
      id: result.id,
      title: result.title,
      verification_status: result.verificationStatus.toLowerCase(),
      status: result.status.toLowerCase(),
      updated_at: result.updatedAt.toISOString(),
    };
  }

  // ─── Tier Management ─────────────────────────────────────

  /**
   * POST /manager/events/:id/tiers/:tierId
   *
   * Updates a sponsorship tier for an event.
   * Managers can edit tiers even when locked.
   */
  async updateTier(
    tenantId: string,
    eventId: string,
    tierId: string,
    dto: UpdateEventTierDto,
    actorId: string,
    actorRole: string,
  ) {
    // Verify event exists and belongs to tenant
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify tier exists and belongs to event
    const tier = await this.prisma.sponsorshipTier.findFirst({
      where: { id: tierId, eventId, tenantId },
    });

    if (!tier) {
      throw new NotFoundException(`Tier ${tierId} not found for event ${eventId}`);
    }

    // Prevent reducing total slots below sold slots
    if (dto.totalSlots !== undefined && dto.totalSlots < tier.soldSlots) {
      throw new BadRequestException(
        `Cannot reduce total slots below already sold slots (${tier.soldSlots})`,
      );
    }

    // Build update data
    const updateData: any = {};
    if (dto.askingPrice !== undefined) {
      updateData.askingPrice = dto.askingPrice;
    }
    if (dto.totalSlots !== undefined) {
      updateData.totalSlots = dto.totalSlots;
    }
    if (dto.isLocked !== undefined) {
      updateData.isLocked = dto.isLocked;
    }

    const updated = await this.prisma.sponsorshipTier.update({
      where: { id: tierId },
      data: updateData,
    });

    // Audit log
    this.auditLogService.log({
      tenantId,
      actorId,
      actorRole,
      action: 'tier.updated',
      entityType: 'SponsorshipTier',
      entityId: tierId,
      metadata: {
        eventId,
        changes: Object.keys(dto),
        previousValues: {
          askingPrice: Number(tier.askingPrice),
          totalSlots: tier.totalSlots,
          isLocked: tier.isLocked,
        },
      },
    });

    this.logger.log(`Tier ${tierId} updated by ${actorRole} for event ${eventId}`);

    return {
      id: updated.id,
      tier_type: updated.tierType,
      asking_price: Number(updated.askingPrice),
      total_slots: updated.totalSlots,
      sold_slots: updated.soldSlots,
      available_slots: updated.totalSlots - updated.soldSlots,
      is_locked: updated.isLocked,
    };
  }

  /**
   * POST /manager/events/:id/tiers
   *
   * Creates a new sponsorship tier for an event.
   */
  async createTier(
    tenantId: string,
    eventId: string,
    dto: {
      tierType: TierType;
      askingPrice: number;
      totalSlots?: number;
    },
    actorId: string,
    actorRole: string,
  ) {
    // Verify event exists
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Check if tier type already exists (for non-CUSTOM tiers)
    if (dto.tierType !== 'CUSTOM') {
      const existingTier = await this.prisma.sponsorshipTier.findFirst({
        where: {
          eventId,
          tierType: dto.tierType,
          isActive: true,
        },
      });

      if (existingTier) {
        throw new BadRequestException(
          `Tier type ${dto.tierType} already exists for this event`,
        );
      }
    }

    const tier = await this.prisma.sponsorshipTier.create({
      data: {
        tenantId,
        eventId,
        tierType: dto.tierType,
        askingPrice: dto.askingPrice,
        totalSlots: dto.totalSlots || 1,
        soldSlots: 0,
        isLocked: false,
        isActive: true,
      },
    });

    // Audit log
    this.auditLogService.log({
      tenantId,
      actorId,
      actorRole,
      action: 'tier.created',
      entityType: 'SponsorshipTier',
      entityId: tier.id,
      metadata: {
        eventId,
        tierType: dto.tierType,
        askingPrice: dto.askingPrice,
        totalSlots: dto.totalSlots || 1,
      },
    });

    this.logger.log(
      `Tier ${tier.id} (${dto.tierType}) created by ${actorRole} for event ${eventId}`,
    );

    return {
      id: tier.id,
      tier_type: tier.tierType,
      asking_price: Number(tier.askingPrice),
      total_slots: tier.totalSlots,
      sold_slots: tier.soldSlots,
      available_slots: tier.totalSlots - tier.soldSlots,
      is_locked: tier.isLocked,
    };
  }

  // ─── Activity Log ────────────────────────────────────────

  /**
   * GET /manager/activity
   *
   * Returns paginated audit log entries for the manager's tenant.
   * Read-only — no write capability. Matches frontend ActivityLogResponse shape.
   */
  async getActivity(tenantId: string, query: ManagerActivityQueryDto) {
    const { page, page_size, type } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      tenantId,
      ...(type && { entityType: type }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        type: log.entityType,
        action: log.action,
        description: `${log.action} on ${log.entityType}`,
        actor: {
          id: log.actorId,
          email: '',
          name: '',
          role: log.actorRole,
        },
        entity_type: log.entityType,
        entity_id: log.entityId,
        metadata: log.metadata as Record<string, unknown> | null,
        created_at: log.createdAt.toISOString(),
      })),
      total,
      page,
      page_size,
    };
  }

  // ─── Proposals ───────────────────────────────────────────

  async getProposals(tenantId: string, query: ManagerProposalsQueryDto) {
    const { page, page_size, status, search } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      tenantId,
      isActive: true,
      ...(status && { status }),
      ...(search && {
        sponsorship: {
          company: { name: { contains: search, mode: 'insensitive' } },
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take: page_size,
        include: {
          sponsorship: { include: { company: true, event: true } },
          tier: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      page_size,
    };
  }

  async getProposalById(tenantId: string, id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id, tenantId },
      include: {
        sponsorship: {
          include: {
            company: true,
            event: { include: { organizer: true, address: true, tiers: true } }
          }
        },
        tier: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    return proposal;
  }

  async updateProposal(
    tenantId: string,
    id: string,
    dto: UpdateManagerProposalDto,
    actorId: string,
    actorRole: string,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id, tenantId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const { status, proposedAmount, proposedTier, notes } = dto;

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        ...(status && { status: status as any }),
        ...(proposedAmount !== undefined && { proposedAmount }),
        ...(proposedTier !== undefined && { proposedTier }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        sponsorship: { include: { company: true, event: true } },
        tier: true,
      },
    });

    this.auditLogService.log({
      tenantId,
      actorId,
      actorRole,
      action: 'proposal.updated',
      entityType: 'Proposal',
      entityId: id,
      metadata: { changes: { ...dto } as any },
    });

    return updated;
  }
}
