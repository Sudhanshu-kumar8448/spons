import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventStatus, VerificationStatus, SponsorshipStatus, ProposalStatus } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import type {
  SponsorEventsQueryDto,
  SponsorProposalsQueryDto,
  SponsorSponsorshipsQueryDto,
} from './dto';
import type { CreateProposalDto } from './dto';

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
            tier_type: t.tierType,
            asking_price: Number(t.askingPrice),
            total_slots: t.totalSlots,
            sold_slots: t.soldSlots,
            available_slots: t.totalSlots - t.soldSlots,
            is_locked: t.isLocked,
            is_active: t.isActive,
            is_available: t.soldSlots < t.totalSlots,
          }));

        return {
          id: e.id,
          title: e.title,
          slug: e.id,
          description: e.description || '',
          start_date: e.startDate.toISOString(),
          end_date: e.endDate.toISOString(),
          location: e.address ? `${e.address.addressLine1}, ${e.address.city}, ${e.address.state}, ${e.address.country}` : '',
          expected_footfall: e.expectedFootfall ?? 0,
          image_url: null,
          category: e.category || '',
          status: 'published',
          organizer: {
            id: e.organizer.id,
            name: e.organizer.name,
            logo_url: null,
          },
          sponsorship_tiers: availableTiers,
          tags: [],
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
        currency: 'USD',
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
          currency: 'USD',
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
        tier_type: t.tierType,
        asking_price: Number(t.askingPrice),
        total_slots: t.totalSlots,
        sold_slots: t.soldSlots,
        available_slots: t.totalSlots - t.soldSlots,
        is_locked: t.isLocked,
        is_active: t.isActive,
        is_available: t.soldSlots < t.totalSlots,
      }));

    return {
      id: event.id,
      title: event.title,
      slug: event.id,
      description: event.description || '',
      start_date: event.startDate.toISOString(),
      end_date: event.endDate.toISOString(),
      location: event.address ? `${event.address.addressLine1}, ${event.address.city}, ${event.address.state}, ${event.address.country}` : '',
      expected_footfall: event.expectedFootfall ?? 0,
      image_url: null,
      category: event.category || '',
      website: event.website || null,
      contact_phone: event.contactPhone || null,
      contact_email: event.contactEmail || null,
      status: 'published',
      organizer: {
        id: event.organizer.id,
        name: event.organizer.name,
        logo_url: null,
      },
      address: event.address ? {
        address_line_1: event.address.addressLine1,
        address_line_2: event.address.addressLine2 || null,
        city: event.address.city,
        state: event.address.state,
        country: event.address.country,
        postal_code: event.address.postalCode,
      } : null,
      sponsorship_tiers: availableTiers,
      tags: [],
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
      currency: 'USD',
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
  async createProposal(companyId: string | undefined, dto: CreateProposalDto) {
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
      actorId: companyId,
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

    this.logger.log(`Proposal ${result.id} created for tier ${tier.tierType} on event ${dto.eventId}`);

    return {
      id: result.id,
      event_id: result.sponsorship.eventId,
      sponsorship_id: result.sponsorship.id,
      tier_id: result.tier?.id || dto.tierId,
      title: result.proposedTier || '',
      description: result.message || '',
      amount: result.proposedAmount ? Number(result.proposedAmount) : 0,
      currency: 'USD',
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
      currency: 'USD',
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
}
