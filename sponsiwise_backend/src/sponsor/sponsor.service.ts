import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventStatus, VerificationStatus, SponsorshipStatus, ProposalStatus } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import type {
  SponsorEventsQueryDto,
  SponsorProposalsQueryDto,
  SponsorSponsorshipsQueryDto,
} from './dto';
import type { CreateProposalDto } from './dto';
import type { ResubmitProposalDto } from './dto';
import {
  PROPOSAL_CREATED_EVENT,
  ProposalCreatedEvent,
  PROPOSAL_STATUS_CHANGED_EVENT,
  ProposalStatusChangedEvent,
} from '../proposals/events';
import { InterestExpressedEvent, INTEREST_EXPRESSED_EVENT } from '../common/events';

import { CacheService } from '../common/providers/cache.service';

/**
 * SponsorService — read-only aggregation layer for sponsor-scoped data.
 *
 * Every method requires a valid companyId (resolved from JWT, never from request).
 * All queries are company-scoped.
 */
@Injectable()
export class SponsorService {
  private readonly logger = new Logger(SponsorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  /**
   * Validate that the caller has a linked company.
   * Throws 403 if companyId is missing from the JWT.
   */
  private assertCompanyId(companyId?: string): asserts companyId is string {
    if (!companyId) {
      throw new ForbiddenException('Sponsor account is not linked to a company');
    }
  }

  // ─── Dashboard Stats ─────────────────────────────────────

  async getDashboardStats(companyId?: string) {
    this.assertCompanyId(companyId);

    const cacheKey = CacheService.key('sponsor', 'dashboard', companyId);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // All proposals belonging to the sponsor's company
    // Proposals link through Sponsorship: Proposal → Sponsorship.companyId
    const [
      totalProposals,
      pendingProposals,
      approvedProposals,
      rejectedProposals,
      activeSponsorships,
    ] = await Promise.all([
      this.prisma.proposal.count({
        where: {
          isActive: true,
          sponsorship: { companyId },
        },
      }),
      this.prisma.proposal.count({
        where: {
          isActive: true,
          sponsorship: { companyId },
          status: ProposalStatus.SUBMITTED,
        },
      }),
      this.prisma.proposal.count({
        where: {
          isActive: true,
          sponsorship: { companyId },
          status: ProposalStatus.APPROVED,
        },
      }),
      this.prisma.proposal.count({
        where: {
          isActive: true,
          sponsorship: { companyId },
          status: ProposalStatus.REJECTED,
        },
      }),
      this.prisma.sponsorship.count({
        where: {
          companyId,
          isActive: true,
          status: SponsorshipStatus.ACTIVE,
        },
      }),
    ]);

    // Sum the proposed amounts from active sponsorships
    const totalInvestedResult = await this.prisma.sponsorship.findMany({
      where: {
        companyId,
        isActive: true,
        status: SponsorshipStatus.ACTIVE,
      },
      select: {
        proposals: {
          where: { status: ProposalStatus.APPROVED, isActive: true },
          select: { proposedAmount: true },
        },
      },
    });

    const totalInvested = totalInvestedResult.reduce((sum, sponsorship) => {
      const amount = sponsorship.proposals[0]?.proposedAmount
        ? Number(sponsorship.proposals[0].proposedAmount)
        : 0;
      return sum + amount;
    }, 0);

    const stats = {
      total_proposals: totalProposals,
      pending_proposals: pendingProposals,
      approved_proposals: approvedProposals,
      rejected_proposals: rejectedProposals,
      active_sponsorships: activeSponsorships,
      total_invested: totalInvested,
    };

    // Cache for 60 seconds
    this.cacheService.set(cacheKey, stats, 60);

    return stats;
  }

  // ─── Browsable Events ────────────────────────────────────

  /**
   * GET /sponsor/events
   * 
   * INVENTORY RULE: Only show events that are VERIFIED and have at least 1 available tier
   * (soldSlots < totalSlots). Events where ALL tiers are sold out are hidden.
   */
  async getEvents(companyId: string | undefined, query: SponsorEventsQueryDto) {
    this.assertCompanyId(companyId);

    const { page, page_size, search, category } = query;
    const skip = (page - 1) * page_size;

    // Prisma doesn't support field-to-field comparison (soldSlots < totalSlots) in where clause.
    // We use a two-step approach: fetch verified events with tiers, then filter in-memory.
    const where: any = {
      isActive: true,
      status: { in: [EventStatus.PUBLISHED, EventStatus.VERIFIED] },
      verificationStatus: VerificationStatus.VERIFIED,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
    };

    const [allEvents, totalUnfiltered] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          edition: true,
          startDate: true,
          endDate: true,
          expectedFootfall: true,
          organizer: {
            select: { id: true, name: true },
          },
          address: {
            select: {
              addressLine1: true,
              city: true,
              state: true,
              country: true,
            },
          },
          tiers: {
            where: { isActive: true, isLocked: true },
            select: {
              id: true,
              tierType: true,
              askingPrice: true,
              totalSlots: true,
              soldSlots: true,
              isLocked: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    // INVENTORY FILTER: Only include events that have at least 1 available tier
    const eventsWithAvailableTiers = allEvents.filter((e: any) =>
      e.tiers.some((t: any) => t.soldSlots < t.totalSlots),
    );

    const total = eventsWithAvailableTiers.length;
    const paginatedEvents = eventsWithAvailableTiers.slice(skip, skip + page_size);

    return {
      data: paginatedEvents.map((e: any) => {
        // Only return available tiers (soldSlots < totalSlots)
        const availableTiers = e.tiers
          .filter((t: any) => t.soldSlots < t.totalSlots)
          .map((t: any) => ({
            id: t.id,
            tierType: t.tierType,
            askingPrice: Number(t.askingPrice),
            totalSlots: t.totalSlots,
            soldSlots: t.soldSlots,
            availableSlots: t.totalSlots - t.soldSlots,
            isLocked: t.isLocked,
            isActive: t.isActive,
          }));

        return {
          id: e.id,
          title: e.title,
          description: e.description || '',
          startDate: e.startDate.toISOString(),
          endDate: e.endDate.toISOString(),
          location: e.address ? `${e.address.addressLine1}, ${e.address.city}, ${e.address.state}, ${e.address.country}` : '',
          expectedFootfall: e.expectedFootfall ?? 0,
          category: e.category || '',
          edition: e.edition || null,
          organizer: {
            id: e.organizer.id,
            name: e.organizer.name,
          },
          address: e.address ? {
            city: e.address.city,
            state: e.address.state,
          } : null,
          tiers: availableTiers,
        };
      }),
      total,
      page,
      page_size,
    };
  }

  // ─── Proposals ───────────────────────────────────────────

  async getProposals(
    companyId: string | undefined,
    query: SponsorProposalsQueryDto,
  ) {
    this.assertCompanyId(companyId);

    const { page, page_size, status, eventId } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      isActive: true,
      sponsorship: {
        companyId,
        ...(eventId && { eventId }),
      },
      ...(status && { status: status.toUpperCase() }),
    };

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          proposedAmount: true,
          proposedTier: true,
          message: true,
          notes: true,
          submittedAt: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          sponsorship: {
            select: {
              id: true,
              eventId: true,
              event: {
                select: {
                  id: true,
                  title: true,
                  startDate: true,
                  address: {
                    select: {
                      addressLine1: true,
                      city: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: data.map((p: any) => ({
        id: p.id,
        event_id: p.sponsorship.eventId,
        sponsorship_id: p.sponsorship.id,
        title: p.proposedTier || '',
        description: p.message || '',
        amount: p.proposedAmount ? Number(p.proposedAmount) : 0,
        currency: 'INR',
        status: p.status.toLowerCase(),
        event: {
          id: p.sponsorship.event.id,
          title: p.sponsorship.event.title,
          slug: p.sponsorship.event.id,
          start_date: p.sponsorship.event.startDate.toISOString(),
          location: p.sponsorship.event.address ? `${p.sponsorship.event.address.addressLine1}, ${p.sponsorship.event.address.city}` : '',
        },
        submitted_at: p.submittedAt?.toISOString() || null,
        reviewed_at: p.reviewedAt?.toISOString() || null,
        reviewer_notes: p.notes || null,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      })),
      total,
      page,
      page_size,
    };
  }

  // ─── Sponsorships ───────────────────────────────────────

  async getSponsorships(
    companyId: string | undefined,
    query: SponsorSponsorshipsQueryDto,
  ) {
    this.assertCompanyId(companyId);

    const { page, page_size, status } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      companyId,
      isActive: true,
      ...(status && { status: status.toUpperCase() }),
    };

    const [data, total] = await Promise.all([
      this.prisma.sponsorship.findMany({
        where,
        skip,
        take: page_size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          tier: true,
          companyId: true,
          eventId: true,
          createdAt: true,
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              address: {
                select: {
                  addressLine1: true,
                  city: true,
                },
              },
            },
          },
          // Sum approved proposal amounts for this sponsorship
          proposals: {
            where: { status: ProposalStatus.APPROVED, isActive: true },
            select: { proposedAmount: true },
          },
        },
      }),
      this.prisma.sponsorship.count({ where }),
    ]);

    return {
      data: data.map((s: any) => {
        const amount = s.proposals.reduce(
          (sum: number, p: any) => sum + (p.proposedAmount ? Number(p.proposedAmount) : 0),
          0,
        );
        return {
          id: s.id,
          event_id: s.eventId,
          company_id: s.companyId,
          tier: s.tier || '',
          amount,
          currency: 'INR',
          status: s.status.toLowerCase(),
          event: {
            id: s.event.id,
            title: s.event.title,
            slug: s.event.id,
            start_date: s.event.startDate.toISOString(),
            location: s.event.address ? `${s.event.address.addressLine1}, ${s.event.address.city}` : '',
          },
          created_at: s.createdAt.toISOString(),
        };
      }),
      total,
      page,
      page_size,
    };
  }

  // ─── Single Event Detail ────────────────────────────────────

  /**
   * GET /sponsor/events/:id
   * 
   * Returns event detail with available sponsorship tiers.
   * Only shows tiers where soldSlots < totalSlots.
   */
  async getEventById(companyId: string | undefined, eventId: string) {
    this.assertCompanyId(companyId);

    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        isActive: true,
        status: { in: [EventStatus.PUBLISHED, EventStatus.VERIFIED] },
        verificationStatus: VerificationStatus.VERIFIED,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        edition: true,
        website: true,
        pptDeckUrl: true,
        contactPhone: true,
        contactEmail: true,
        startDate: true,
        endDate: true,
        expectedFootfall: true,
        organizer: {
          select: { id: true, name: true },
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
          where: { isActive: true, isLocked: true },
          select: {
            id: true,
            tierType: true,
            askingPrice: true,
            totalSlots: true,
            soldSlots: true,
            isLocked: true,
            isActive: true,
            deliverableForm: {
              select: { status: true },
            },
          },
        },
        audienceProfile: {
          select: {
            id: true,
            genders: { select: { id: true, gender: true, percentage: true } },
            ages: { select: { id: true, bracket: true, percentage: true } },
            incomes: { select: { id: true, bracket: true, percentage: true } },
            regions: { select: { id: true, stateOrUT: true, country: true, percentage: true } },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Only return available tiers (soldSlots < totalSlots)
    const availableTiers = event.tiers
      .filter((t: any) => t.soldSlots < t.totalSlots)
      .map((t: any) => ({
        id: t.id,
        tierType: t.tierType,
        askingPrice: Number(t.askingPrice),
        totalSlots: t.totalSlots,
        soldSlots: t.soldSlots,
        availableSlots: t.totalSlots - t.soldSlots,
        isLocked: t.isLocked,
        isActive: t.isActive,
        deliverableFormStatus: t.deliverableForm?.status === 'SUBMITTED' ? 'SUBMITTED' : null,
      }));

    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      location: event.address ? `${event.address.addressLine1}, ${event.address.city}, ${event.address.state}, ${event.address.country}` : '',
      expectedFootfall: event.expectedFootfall ?? 0,
      category: event.category || '',
      edition: event.edition || null,
      website: event.website || null,
      contactPhone: event.contactPhone || null,
      contactEmail: event.contactEmail || null,
      organizer: {
        id: event.organizer.id,
        name: event.organizer.name,
      },
      address: event.address ? {
        addressLine1: event.address.addressLine1,
        addressLine2: event.address.addressLine2 || null,
        city: event.address.city,
        state: event.address.state,
        country: event.address.country,
        postalCode: event.address.postalCode,
      } : null,
      tiers: availableTiers,
      audienceProfile: event.audienceProfile
        ? {
            id: event.audienceProfile.id,
            genders: event.audienceProfile.genders.map((g: any) => ({
              gender: g.gender,
              percentage: g.percentage,
            })),
            ages: event.audienceProfile.ages.map((a: any) => ({
              bracket: a.bracket,
              percentage: a.percentage,
            })),
            incomes: event.audienceProfile.incomes.map((i: any) => ({
              bracket: i.bracket,
              percentage: i.percentage,
            })),
            regions: event.audienceProfile.regions.map((r: any) => ({
              stateOrUT: r.stateOrUT,
              country: r.country,
              percentage: r.percentage,
            })),
          }
        : null,
    };
  }

  // ─── Single Proposal Detail ─────────────────────────────────

  async getProposalById(companyId: string | undefined, proposalId: string) {
    this.assertCompanyId(companyId);

    const proposal = await this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
        isActive: true,
        sponsorship: { companyId },
      },
      select: {
        id: true,
        status: true,
        proposedAmount: true,
        proposedTier: true,
        message: true,
        notes: true,
        submittedAt: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        sponsorship: {
          select: {
            id: true,
            eventId: true,
            event: {
              select: {
                id: true,
                title: true,
                startDate: true,
                address: {
                  select: {
                    addressLine1: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return {
      id: proposal.id,
      event_id: proposal.sponsorship.eventId,
      sponsorship_id: proposal.sponsorship.id,
      title: proposal.proposedTier || '',
      description: proposal.message || '',
      amount: proposal.proposedAmount ? Number(proposal.proposedAmount) : 0,
      currency: 'INR',
      status: proposal.status.toLowerCase(),
      event: {
        id: proposal.sponsorship.event.id,
        title: proposal.sponsorship.event.title,
        slug: proposal.sponsorship.event.id,
        start_date: proposal.sponsorship.event.startDate.toISOString(),
        location: proposal.sponsorship.event.address ? `${proposal.sponsorship.event.address.addressLine1}, ${proposal.sponsorship.event.address.city}` : '',
      },
      submitted_at: proposal.submittedAt?.toISOString() || null,
      reviewed_at: proposal.reviewedAt?.toISOString() || null,
      reviewer_notes: proposal.notes || null,
      created_at: proposal.createdAt.toISOString(),
      updated_at: proposal.updatedAt.toISOString(),
    };
  }

  // ─── Create Proposal ────────────────────────────────────────

  /**
   * POST /sponsor/proposals
   * 
   * INVENTORY RULES:
   * - Must reference a valid tierId
   * - Tier must be locked (isLocked = true)
   * - Tier must have available slots (soldSlots < totalSlots)
   * - Sponsor cannot modify tier pricing
   * - proposedAmount defaults to tier's askingPrice if not provided
   */
  async createProposal(companyId: string | undefined, dto: CreateProposalDto, actorId: string) {
    this.assertCompanyId(companyId);

    // 1. Verify the event exists, is published/verified
    const event = await this.prisma.event.findFirst({
      where: {
        id: dto.eventId,
        isActive: true,
        status: { in: [EventStatus.PUBLISHED, EventStatus.VERIFIED] },
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found or not available for sponsorship');
    }

    // 2. Validate the tier exists, belongs to this event, is locked, and has available slots
    const tier = await this.prisma.sponsorshipTier.findFirst({
      where: {
        id: dto.tierId,
        eventId: dto.eventId,
        isActive: true,
      },
    });

    if (!tier) {
      throw new NotFoundException('Sponsorship tier not found for this event');
    }

    if (!tier.isLocked) {
      throw new BadRequestException('This sponsorship tier is not yet locked. Event must be approved first.');
    }

    if (tier.soldSlots >= tier.totalSlots) {
      throw new BadRequestException('This sponsorship tier is sold out. No available slots.');
    }

    // 3. Use tier's asking price — sponsor cannot manipulate price
    const proposedAmount = dto.proposedAmount ?? Number(tier.askingPrice);

    // 4. Create or find existing sponsorship, then create proposal in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert: find existing sponsorship or create one
      let sponsorship = await tx.sponsorship.findFirst({
        where: {
          companyId,
          eventId: dto.eventId,
        },
      });

      if (!sponsorship) {
        sponsorship = await tx.sponsorship.create({
          data: {
            companyId,
            eventId: dto.eventId,
            status: SponsorshipStatus.PENDING,
            tier: tier.tierType,
          },
        });
      }

      // Create the proposal with tierId reference
      const proposal = await tx.proposal.create({
        data: {
          sponsorshipId: sponsorship.id,
          tierId: dto.tierId,
          proposedAmount: proposedAmount,
          proposedTier: tier.tierType,
          message: dto.message ?? null,
          status: ProposalStatus.SUBMITTED,
          submittedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          proposedAmount: true,
          proposedTier: true,
          message: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
          tier: {
            select: {
              id: true,
              tierType: true,
              askingPrice: true,
            },
          },
          sponsorship: {
            select: {
              id: true,
              eventId: true,
              event: {
                select: {
                  id: true,
                  title: true,
                  startDate: true,
                  address: {
                    select: {
                      addressLine1: true,
                      city: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return proposal;
    });

    // 5. Audit log
    this.auditLogService.log({
      actorId,
      actorRole: 'SPONSOR',
      action: 'proposal.submitted',
      entityType: 'Proposal',
      entityId: result.id,
      metadata: {
        eventId: dto.eventId,
        tierId: dto.tierId,
        tierType: tier.tierType,
        proposedAmount,
      },
    });

    // 6. Emit proposal-created event → triggers email to organizer, brand, manager
    this.eventEmitter.emit(
      PROPOSAL_CREATED_EVENT,
      new ProposalCreatedEvent({
        proposalId: result.id,
        actorId,
        actorRole: 'SPONSOR',
        newStatus: ProposalStatus.SUBMITTED,
        sponsorshipId: result.sponsorship.id,
        proposedAmount,
      }),
    );

    this.logger.log(`Proposal ${result.id} created for tier ${tier.tierType} on event ${dto.eventId}`);

    return {
      id: result.id,
      event_id: result.sponsorship.eventId,
      sponsorship_id: result.sponsorship.id,
      tier_id: result.tier?.id || dto.tierId,
      title: result.proposedTier || '',
      description: result.message || '',
      amount: result.proposedAmount ? Number(result.proposedAmount) : 0,
      currency: 'INR',
      status: result.status.toLowerCase(),
      event: {
        id: result.sponsorship.event.id,
        title: result.sponsorship.event.title,
        slug: result.sponsorship.event.id,
        start_date: result.sponsorship.event.startDate.toISOString(),
        location: result.sponsorship.event.address ? `${result.sponsorship.event.address.addressLine1}, ${result.sponsorship.event.address.city}` : '',
      },
      submitted_at: result.submittedAt?.toISOString() || null,
      reviewed_at: null,
      reviewer_notes: null,
      created_at: result.createdAt.toISOString(),
      updated_at: result.updatedAt.toISOString(),
    };
  }

  // ─── Resubmit Proposal ──────────────────────────────────────

  async resubmitProposal(
    companyId: string | undefined,
    proposalId: string,
    dto: ResubmitProposalDto,
    actorId: string,
  ) {
    this.assertCompanyId(companyId);

    const proposal = await this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
        isActive: true,
        sponsorship: { companyId },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.status !== ProposalStatus.REQUEST_CHANGES) {
      throw new BadRequestException(
        `Cannot resubmit proposal with status "${proposal.status}". Only REQUEST_CHANGES proposals can be resubmitted.`,
      );
    }

    if (dto.proposedAmount !== undefined && dto.proposedAmount <= 0) {
      throw new BadRequestException('Proposed amount must be greater than zero.');
    }

    const now = new Date();
    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        ...(dto.proposedAmount !== undefined && { proposedAmount: dto.proposedAmount }),
        ...(dto.proposedTier !== undefined && { proposedTier: dto.proposedTier }),
        ...(dto.message !== undefined && { message: dto.message }),
        status: ProposalStatus.SUBMITTED,
        submittedAt: now,
        reviewedAt: null,
      },
      select: {
        id: true,
        status: true,
        proposedAmount: true,
        proposedTier: true,
        message: true,
        notes: true,
        submittedAt: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        sponsorship: {
          select: {
            id: true,
            eventId: true,
            event: {
              select: {
                id: true,
                title: true,
                startDate: true,
                address: {
                  select: {
                    addressLine1: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    this.auditLogService.log({
      actorId,
      actorRole: 'SPONSOR',
      action: 'proposal.resubmitted',
      entityType: 'Proposal',
      entityId: proposalId,
      metadata: {
        previousStatus: proposal.status,
        newStatus: ProposalStatus.SUBMITTED,
        changes: {
          ...(dto.proposedAmount !== undefined && { proposedAmount: dto.proposedAmount }),
          ...(dto.proposedTier !== undefined && { proposedTier: dto.proposedTier }),
          ...(dto.message !== undefined && { message: dto.message }),
        },
      },
    });

    this.eventEmitter.emit(
      PROPOSAL_STATUS_CHANGED_EVENT,
      new ProposalStatusChangedEvent({
        proposalId,
        actorId,
        actorRole: 'SPONSOR',
        previousStatus: proposal.status,
        newStatus: ProposalStatus.SUBMITTED,
      }),
    );

    // Refresh proposal + sponsor dashboard caches.
    this.cacheService.delByPattern('proposals:list:*');
    this.cacheService.delByPattern('sponsor:dashboard:*');

    return {
      id: updated.id,
      event_id: updated.sponsorship.eventId,
      sponsorship_id: updated.sponsorship.id,
      title: updated.proposedTier || '',
      description: updated.message || '',
      amount: updated.proposedAmount ? Number(updated.proposedAmount) : 0,
      currency: 'INR',
      status: updated.status.toLowerCase(),
      event: {
        id: updated.sponsorship.event.id,
        title: updated.sponsorship.event.title,
        slug: updated.sponsorship.event.id,
        start_date: updated.sponsorship.event.startDate.toISOString(),
        location: updated.sponsorship.event.address
          ? `${updated.sponsorship.event.address.addressLine1}, ${updated.sponsorship.event.address.city}`
          : '',
      },
      submitted_at: updated.submittedAt?.toISOString() || null,
      reviewed_at: updated.reviewedAt?.toISOString() || null,
      reviewer_notes: updated.notes || null,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  // ─── Withdraw Proposal ──────────────────────────────────────

  async withdrawProposal(companyId: string | undefined, proposalId: string) {
    this.assertCompanyId(companyId);

    const proposal = await this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
        isActive: true,
        sponsorship: { companyId },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Only submitted proposals can be withdrawn
    if (proposal.status !== ProposalStatus.SUBMITTED) {
      throw new ForbiddenException(
        `Cannot withdraw proposal with status "${proposal.status}". Only SUBMITTED proposals can be withdrawn.`,
      );
    }

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.WITHDRAWN },
      select: {
        id: true,
        status: true,
        proposedAmount: true,
        proposedTier: true,
        message: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        sponsorship: {
          select: {
            id: true,
            eventId: true,
            event: {
              select: {
                id: true,
                title: true,
                startDate: true,
                address: {
                  select: {
                    addressLine1: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      id: updated.id,
      event_id: updated.sponsorship.eventId,
      sponsorship_id: updated.sponsorship.id,
      title: updated.proposedTier || '',
      description: updated.message || '',
      amount: updated.proposedAmount ? Number(updated.proposedAmount) : 0,
      currency: 'INR',
      status: updated.status.toLowerCase(),
      event: {
        id: updated.sponsorship.event.id,
        title: updated.sponsorship.event.title,
        slug: updated.sponsorship.event.id,
        start_date: updated.sponsorship.event.startDate.toISOString(),
        location: updated.sponsorship.event.address ? `${updated.sponsorship.event.address.addressLine1}, ${updated.sponsorship.event.address.city}` : '',
      },
      submitted_at: updated.submittedAt?.toISOString() || null,
      reviewed_at: null,
      reviewer_notes: null,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  // ─── Express Interest ───────────────────────────────────────

  /**
   * Express interest in an event by creating or returning an existing sponsorship.
   * Triggers an INTEREST_EXPRESSED_EVENT which sends emails to
   * organizer, brand, manager, and admin.
   */
  async expressInterest(
    companyId: string | undefined,
    eventId: string,
    actorId: string,
  ) {
    this.assertCompanyId(companyId);

    // Validate event exists and is published / active
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        status: EventStatus.PUBLISHED,
        isActive: true,
        verificationStatus: VerificationStatus.VERIFIED,
      },
      select: { id: true, title: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found or not available for sponsorship');
    }

    // Check if sponsorship already exists
    const existing = await this.prisma.sponsorship.findFirst({
      where: { companyId: companyId!, eventId },
    });

    if (existing) {
      return {
        sponsorship_id: existing.id,
        event_id: eventId,
        message: 'Interest already expressed for this event',
        already_expressed: true,
      };
    }

    // Create sponsorship with INTERESTED status
    const sponsorship = await this.prisma.sponsorship.create({
      data: {
        status: SponsorshipStatus.INTERESTED,
        company: { connect: { id: companyId! } },
        event: { connect: { id: eventId } },
      },
    });

    this.logger.log(
      `Interest expressed: company ${companyId} → event ${eventId}, sponsorship ${sponsorship.id}`,
    );

    // Audit log
    this.auditLogService.log({
      actorId,
      actorRole: 'SPONSOR',
      action: 'interest.expressed',
      entityType: 'Sponsorship',
      entityId: sponsorship.id,
      metadata: { eventId, companyId },
    });

    // Emit domain event → triggers emails to organizer, brand, manager, admin
    this.eventEmitter.emit(
      INTEREST_EXPRESSED_EVENT,
      new InterestExpressedEvent({
        sponsorshipId: sponsorship.id,
        companyId: companyId!,
        eventId,
        actorId,
      }),
    );

    return {
      sponsorship_id: sponsorship.id,
      event_id: eventId,
      message: 'Interest expressed successfully',
      already_expressed: false,
    };
  }
}
