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
import {
  PROPOSAL_STATUS_CHANGED_EVENT,
  ProposalStatusChangedEvent,
} from '../proposals/events';
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
  async getDashboardStats() {
    const [
      companiesPending,
      companiesVerified,
      eventsPending,
      eventsVerified,
      totalUsers,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.company.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      }),
      this.prisma.company.count({
        where: { verificationStatus: VerificationStatus.VERIFIED },
      }),
      this.prisma.event.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      }),
      this.prisma.event.count({
        where: { verificationStatus: VerificationStatus.VERIFIED },
      }),
      this.prisma.user.count({
        where: { isActive: true },
      }),
      // Users registered in the last 7 days
      this.prisma.user.count({
        where: {
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
   * Returns paginated companies.
   * Default filter: verificationStatus = PENDING.
   * Matches frontend VerifiableCompaniesResponse shape.
   */
  async getCompanies(query: ManagerCompaniesQueryDto) {
    const { page, page_size, verification_status, search } = query;
    const skip = (page - 1) * page_size;

    // When verification_status is empty/"all" → return all. Otherwise filter by status.
    const statusFilter = verification_status
      ? (verification_status.toUpperCase() as VerificationStatus)
      : undefined;

    const where: any = {
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
          strategicIntent: true,
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
        type: c.type || null,
        website: c.website || null,
        logoUrl: null,
        description: c.strategicIntent || '',
        verificationStatus: c.verificationStatus,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
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
   * Returns single company detail.
   */
  async getCompanyById(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        website: true,
        strategicIntent: true,
        verificationStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        approvedById: true,
        approvedAt: true,
        rejectionReason: true,
        approvedBy: {
          select: { id: true, email: true },
        },
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
      type: company.type || null,
      website: company.website || null,
      logoUrl: null,
      description: company.strategicIntent || '',
      verificationStatus: company.verificationStatus,
      isActive: company.isActive,
      rejectionReason: company.rejectionReason || null,
      verifiedAt: company.approvedAt ? company.approvedAt.toISOString() : null,
      verifiedBy: company.approvedBy
        ? { id: company.approvedBy.id, email: company.approvedBy.email }
        : null,
      owner: {
        id: owner.id,
        email: owner.email,
        name: company.name,
      },
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    };
  }

  // ─── Company Verification Action ────────────────────────

  /**
   * POST /manager/companies/:id/verify
   *
   * Updates a company's verification status and emits domain event.
   */
  async verifyCompany(
    companyId: string,
    dto: VerifyEntityDto,
    reviewerId: string,
    reviewerRole: string,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId },
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
      data: {
        verificationStatus: newStatus,
        approvedById: reviewerId,
        approvedAt: new Date(),
        rejectionReason: dto.action === 'reject' ? (dto.notes || null) : null,
      },
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
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    }

    this.logger.log(`Company ${companyId} ${dto.action}d by ${reviewerId}`);

    return {
      id: updated.id,
      name: updated.name,
      verificationStatus: updated.verificationStatus,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ─── Events Verification Queue ───────────────────────────

  /**
   * GET /manager/events
   *
   * Returns paginated events.
   * Default filter: verificationStatus = PENDING.
   * Matches frontend VerifiableEventsResponse shape.
   */
  async getEvents(query: ManagerEventsQueryDto) {
    const { page, page_size, verification_status, status, search } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      ...(verification_status
        ? { verificationStatus: verification_status.toUpperCase() as VerificationStatus }
        : !status && { verificationStatus: VerificationStatus.PENDING }),
      ...(status && { status: status.toUpperCase() as EventStatus }),
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
          edition: true,
          startDate: true,
          endDate: true,
          status: true,
          verificationStatus: true,
          expectedFootfall: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          organizer: {
            select: {
              id: true,
              name: true,
              contactPhone: true,
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
          image_url: null,
          category: e.category || '',
          edition: e.edition || null,
          status: e.status.toLowerCase(),
          verification_status: e.verificationStatus.toLowerCase(),
          verification_notes: null,
          verified_at: null,
          expected_footfall: e.expectedFootfall,
          organizer: {
            id: e.organizer.id,
            name: e.organizer.name,
            email: e.organizer.contactPhone || '',
            logo_url: null,
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
   * Returns single event detail with sponsorship tiers.
   */
  async getEventById(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        description: true,
        edition: true,
        startDate: true,
        endDate: true,
        status: true,
        website: true,
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
            contactPhone: true,
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
            deliverableForm: {
              select: { status: true },
            },
          },
          orderBy: { tierType: 'asc' },
        },
        audienceProfile: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            genders: {
              select: {
                id: true,
                gender: true,
                percentage: true,
              },
            },
            ages: {
              select: {
                id: true,
                bracket: true,
                percentage: true,
              },
            },
            incomes: {
              select: {
                id: true,
                bracket: true,
                percentage: true,
              },
            },
            regions: {
              select: {
                id: true,
                stateOrUT: true,
                country: true,
                percentage: true,
              },
            },
          },
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
      custom_name: tier.customName || null,
      asking_price: Number(tier.askingPrice),
      total_slots: tier.totalSlots,
      sold_slots: tier.soldSlots,
      available_slots: tier.totalSlots - tier.soldSlots,
      is_locked: tier.isLocked,
      is_active: tier.isActive,
      is_available: tier.soldSlots < tier.totalSlots,
      deliverable_form_status: tier.deliverableForm?.status ?? null,
    }));

    // Transform audience profile
    const audienceProfile = event.audienceProfile
      ? {
          id: event.audienceProfile.id,
          genders: event.audienceProfile.genders.map((g: any) => ({
            id: g.id,
            gender: g.gender,
            percentage: g.percentage,
          })),
          ages: event.audienceProfile.ages.map((a: any) => ({
            id: a.id,
            bracket: a.bracket,
            percentage: a.percentage,
          })),
          incomes: event.audienceProfile.incomes.map((i: any) => ({
            id: i.id,
            bracket: i.bracket,
            percentage: i.percentage,
          })),
          regions: event.audienceProfile.regions.map((r: any) => ({
            id: r.id,
            stateOrUT: r.stateOrUT,
            country: r.country,
            percentage: r.percentage,
          })),
          created_at: event.audienceProfile.createdAt.toISOString(),
          updated_at: event.audienceProfile.updatedAt.toISOString(),
        }
      : null;

    return {
      id: event.id,
      title: event.title,
      slug: event.id,
      description: event.description || '',
      start_date: event.startDate.toISOString(),
      end_date: event.endDate.toISOString(),
      location: event.address ? `${event.address.addressLine1}, ${event.address.city}` : '',
      venue: '',
      image_url: null,
      website: event.website || null,
      category: event.category || '',
      edition: event.edition || null,
      status: event.status.toLowerCase(),
      verification_status: event.verificationStatus.toLowerCase(),
      verification_notes: null,
      verified_at: null,
      organizer: {
        id: event.organizer.id,
        name: event.organizer.name,
        email: event.organizer.contactPhone || '',
        logo_url: null,
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
      audience_profile: audienceProfile,
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
    eventId: string,
    dto: UpdateManagerEventDto,
    actorId: string,
    actorRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
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
      if (dto.category !== undefined) coreData.category = dto.category;
      if (dto.edition !== undefined) coreData.edition = dto.edition;
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
      actorId,
      actorRole,
      action: 'event.updated',
      entityType: 'Event',
      entityId: eventId,
      metadata: { source: 'manager_dashboard' },
    });

    // Reuse getEventById to return fully hydrated object
    return this.getEventById(eventId);
  }

  // ─── Event Verification Action ──────────────────────────

  /**
   * POST /manager/events/:id/verify
   *
   * Updates an event's verification status and emits domain event.
   * When verified, also locks all sponsorship tiers to prevent modification.
   */
  async verifyEvent(
    eventId: string,
    dto: VerifyEntityDto,
    reviewerId: string,
    reviewerRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
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
          reviewerId,
          reviewerRole,
          reviewerNotes: dto.notes || null,
        }),
      );
    }

    // Audit log for event verification
    this.auditLogService.log({
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

    this.logger.log(`Event ${eventId} ${dto.action}d by ${reviewerId}`);

    return {
      id: result.id,
      title: result.title,
      verification_status: result.verificationStatus.toLowerCase(),
      status: result.status.toLowerCase(),
      updated_at: result.updatedAt.toISOString(),
    };
  }

  // ─── Publish / Cancel Events ─────────────────────────────

  /**
   * POST /manager/events/:id/publish
   *
   * Publishes an event that already has EventStatus.VERIFIED.
   * Only verified events can be published.
   */
  async publishEvent(
    eventId: string,
    actorId: string,
    actorRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (event.status !== EventStatus.VERIFIED) {
      throw new BadRequestException(
        `Only verified events can be published. Current status: ${event.status}`,
      );
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.PUBLISHED },
    });

    this.auditLogService.log({
      actorId,
      actorRole,
      action: 'event.published',
      entityType: 'Event',
      entityId: eventId,
      metadata: {
        previousStatus: event.status,
        newStatus: EventStatus.PUBLISHED,
      },
    });

    this.logger.log(`Event ${eventId} published by ${actorId}`);

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      verificationStatus: updated.verificationStatus,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * POST /manager/events/:id/cancel
   *
   * Cancels an event. Events in DRAFT or COMPLETED status cannot be cancelled.
   */
  async cancelEvent(
    eventId: string,
    notes: string | undefined,
    actorId: string,
    actorRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Event is already cancelled');
    }

    if (event.status === EventStatus.COMPLETED) {
      throw new BadRequestException('Completed events cannot be cancelled');
    }

    if (event.status === EventStatus.DRAFT) {
      throw new BadRequestException(
        'Draft events cannot be cancelled by manager. Ask the organizer to delete it instead.',
      );
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.CANCELLED,
        rejectionReason: notes || null,
      },
    });

    this.auditLogService.log({
      actorId,
      actorRole,
      action: 'event.cancelled',
      entityType: 'Event',
      entityId: eventId,
      metadata: {
        previousStatus: event.status,
        newStatus: EventStatus.CANCELLED,
        notes: notes || null,
      },
    });

    this.logger.log(`Event ${eventId} cancelled by ${actorId}`);

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      verificationStatus: updated.verificationStatus,
      updatedAt: updated.updatedAt.toISOString(),
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
    eventId: string,
    tierId: string,
    dto: UpdateEventTierDto,
    actorId: string,
    actorRole: string,
  ) {
    // Verify event exists
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify tier exists and belongs to event
    const tier = await this.prisma.sponsorshipTier.findFirst({
      where: { id: tierId, eventId },
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
      where: { id: eventId },
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
   * Returns paginated audit log entries.
   * Read-only — no write capability. Matches frontend ActivityLogResponse shape.
   */
  async getActivity(query: ManagerActivityQueryDto) {
    const { page, page_size, type } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
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

  async getProposals(query: ManagerProposalsQueryDto) {
    const { page, page_size, status, search } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
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

  async getProposalById(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
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
    id: string,
    dto: UpdateManagerProposalDto,
    actorId: string,
    actorRole: string,
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
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
      actorId,
      actorRole,
      action: 'proposal.updated',
      entityType: 'Proposal',
      entityId: id,
      metadata: { changes: { ...dto } as any },
    });

    // Emit status-change event if the status was updated
    if (status && status !== proposal.status) {
      this.eventEmitter.emit(
        PROPOSAL_STATUS_CHANGED_EVENT,
        new ProposalStatusChangedEvent({
          proposalId: id,
          actorId,
          actorRole,
          previousStatus: proposal.status,
          newStatus: status as any,
        }),
      );
    }

    return updated;
  }
}
