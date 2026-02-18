import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventStatus, ProposalStatus, SponsorshipStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/providers/prisma.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { CacheService } from '../common/providers/cache.service';
import { ProposalStatusChangedEvent, PROPOSAL_STATUS_CHANGED_EVENT } from '../proposals/events';
import type { OrganizerEventsQueryDto, OrganizerProposalsQueryDto, ReviewProposalDto, CreateOrganizerEventDto } from './dto';

/**
 * OrganizerDashboardService — read-mostly aggregation layer for organizer-scoped data.
 *
 * Every method requires organizerId (resolved from JWT, never from request).
 * All queries are tenant-scoped AND organizer-scoped.
 *
 * The review endpoint reuses the same status transition logic and events
 * as ProposalService to avoid duplication, implemented inline with proper
 * audit logging and domain events.
 */
@Injectable()
export class OrganizerDashboardService {
  private readonly logger = new Logger(OrganizerDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) { }

  /**
   * Validate that the caller has a linked organizer.
   * Throws 403 if organizerId is missing from the JWT.
   */
  private assertOrganizerId(organizerId?: string): asserts organizerId is string {
    if (!organizerId) {
      throw new ForbiddenException('Organizer account is not linked to an organizer entity');
    }
  }

  // ─── Dashboard Stats ─────────────────────────────────────

  /**
   * GET /organizer/dashboard/stats
   *
   * Returns aggregate stats for the organizer dashboard overview:
   * - Total events, published events
   * - Total proposals received, pending, approved
   * - Total sponsorship revenue
   */
  async getDashboardStats(tenantId: string, organizerId?: string) {
    this.assertOrganizerId(organizerId);

    const [
      totalEvents,
      publishedEvents,
      totalProposalsReceived,
      pendingProposals,
      approvedProposals,
    ] = await Promise.all([
      // Total events owned by this organizer
      this.prisma.event.count({
        where: { tenantId, organizerId, isActive: true },
      }),
      // Published events
      this.prisma.event.count({
        where: {
          tenantId,
          organizerId,
          isActive: true,
          status: EventStatus.PUBLISHED,
        },
      }),
      // Total proposals received (on organizer's events)
      this.prisma.proposal.count({
        where: {
          tenantId,
          isActive: true,
          sponsorship: { event: { organizerId } },
        },
      }),
      // Pending proposals (SUBMITTED or UNDER_REVIEW)
      this.prisma.proposal.count({
        where: {
          tenantId,
          isActive: true,
          sponsorship: { event: { organizerId } },
          status: { in: [ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW] },
        },
      }),
      // Approved proposals
      this.prisma.proposal.count({
        where: {
          tenantId,
          isActive: true,
          sponsorship: { event: { organizerId } },
          status: ProposalStatus.APPROVED,
        },
      }),
    ]);

    // Sum approved proposal amounts as sponsorship revenue
    const revenueResult = await this.prisma.proposal.findMany({
      where: {
        tenantId,
        isActive: true,
        status: ProposalStatus.APPROVED,
        sponsorship: { event: { organizerId } },
      },
      select: { proposedAmount: true },
    });

    let totalSponsorshipRevenue = 0;
    for (const p of revenueResult) {
      totalSponsorshipRevenue += p.proposedAmount ? Number(p.proposedAmount) : 0;
    }

    return {
      total_events: totalEvents,
      published_events: publishedEvents,
      total_proposals_received: totalProposalsReceived,
      pending_proposals: pendingProposals,
      approved_proposals: approvedProposals,
      total_sponsorship_revenue: totalSponsorshipRevenue,
      currency: 'USD',
    };
  }

  // ─── Create Event ───────────────────────────────────────

  /**
   * POST /organizer/events
   *
   * Creates a new event owned by this organizer.
   * - organizerId is derived from the JWT.
   * - The event is created in DRAFT status with PENDING verification.
   * - Date range is validated (endDate must be after startDate).
   */
  async createEvent(
    tenantId: string,
    organizerId: string | undefined,
    dto: CreateOrganizerEventDto,
  ) {
    this.assertOrganizerId(organizerId);

    // Validate date range
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.venue !== undefined && { venue: dto.venue }),
        expectedFootfall: dto.expectedFootfall,
        startDate: start,
        endDate: end,
        status: EventStatus.DRAFT,
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        tenant: { connect: { id: tenantId } },
        organizer: { connect: { id: organizerId } },
      },
    });

    this.logger.log(
      `Event ${event.id} created by organizer ${organizerId} in tenant ${tenantId}`,
    );

    // Invalidate event list caches
    this.cacheService.delByPattern('events:list:*');

    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      venue: event.venue || '',
      start_date: event.startDate.toISOString(),
      end_date: event.endDate.toISOString(),
      expected_footfall: event.expectedFootfall,
      status: event.status.toLowerCase(),
      verification_status: event.verificationStatus.toLowerCase(),
      website: event.website || '',
      logo_url: event.logoUrl || null,
      created_at: event.createdAt.toISOString(),
      updated_at: event.updatedAt.toISOString(),
    };
  }

  // ─── Events ──────────────────────────────────────────────

  /**
   * GET /organizer/events
   *
   * Returns paginated list of events owned by this organizer.
   * Includes proposal counts and sponsorship revenue per event.
   */
  async getEvents(
    tenantId: string,
    organizerId: string | undefined,
    query: OrganizerEventsQueryDto,
  ) {
    this.assertOrganizerId(organizerId);

    const { page, page_size, status, search } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      tenantId,
      organizerId,
      isActive: true,
      ...(status && { status: status.toUpperCase() }),
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
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          startDate: true,
          endDate: true,
          logoUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          sponsorships: {
            where: { isActive: true },
            select: {
              id: true,
              tier: true,
              status: true,
              proposals: {
                where: { isActive: true },
                select: {
                  id: true,
                  status: true,
                  proposedAmount: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: data.map((e) => {
        // Aggregate proposal counts and revenue per event
        let totalProposals = 0;
        let pendingProposals = 0;
        let totalSponsorshipAmount = 0;

        for (const s of e.sponsorships) {
          for (const p of s.proposals) {
            totalProposals++;
            if (p.status === ProposalStatus.SUBMITTED || p.status === ProposalStatus.UNDER_REVIEW) {
              pendingProposals++;
            }
            if (p.status === ProposalStatus.APPROVED && p.proposedAmount) {
              totalSponsorshipAmount += Number(p.proposedAmount);
            }
          }
        }

        return {
          id: e.id,
          title: e.title,
          slug: e.id,
          description: e.description || '',
          start_date: e.startDate.toISOString(),
          end_date: e.endDate.toISOString(),
          location: e.location || '',
          image_url: e.logoUrl || null,
          category: '',
          status: e.status.toLowerCase(),
          sponsorship_tiers: e.sponsorships.map((s) => ({
            id: s.id,
            name: s.tier || '',
            description: '',
            amount: 0,
            currency: 'USD',
            benefits: [],
            slots_total: 0,
            slots_available: 0,
          })),
          tags: [],
          total_proposals: totalProposals,
          pending_proposals: pendingProposals,
          total_sponsorship_amount: totalSponsorshipAmount,
          currency: 'USD',
          created_at: e.createdAt.toISOString(),
          updated_at: e.updatedAt.toISOString(),
        };
      }),
      total,
      page,
      page_size,
    };
  }

  // ─── Single Event ─────────────────────────────────────────

  /**
   * GET /organizer/events/:id
   *
   * Returns a single event owned by this organizer with aggregated proposal data.
   */
  async getEventById(eventId: string, tenantId: string, organizerId?: string) {
    this.assertOrganizerId(organizerId);

    const e = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, organizerId, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
        logoUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        sponsorships: {
          where: { isActive: true },
          select: {
            id: true,
            tier: true,
            status: true,
            proposals: {
              where: { isActive: true },
              select: { id: true, status: true, proposedAmount: true },
            },
          },
        },
      },
    });

    if (!e) {
      throw new NotFoundException('Event not found');
    }

    let totalProposals = 0;
    let pendingProposals = 0;
    let totalSponsorshipAmount = 0;

    for (const s of e.sponsorships) {
      for (const p of s.proposals) {
        totalProposals++;
        if (p.status === ProposalStatus.SUBMITTED || p.status === ProposalStatus.UNDER_REVIEW) {
          pendingProposals++;
        }
        if (p.status === ProposalStatus.APPROVED && p.proposedAmount) {
          totalSponsorshipAmount += Number(p.proposedAmount);
        }
      }
    }

    return {
      id: e.id,
      title: e.title,
      slug: e.id,
      description: e.description || '',
      start_date: e.startDate.toISOString(),
      end_date: e.endDate.toISOString(),
      location: e.location || '',
      image_url: e.logoUrl || null,
      category: '',
      status: e.status.toLowerCase(),
      sponsorship_tiers: e.sponsorships.map((s) => ({
        id: s.id,
        name: s.tier || '',
        description: '',
        amount: 0,
        currency: 'USD',
        benefits: [],
        slots_total: 0,
        slots_available: 0,
      })),
      tags: [],
      total_proposals: totalProposals,
      pending_proposals: pendingProposals,
      total_sponsorship_amount: totalSponsorshipAmount,
      currency: 'USD',
      created_at: e.createdAt.toISOString(),
      updated_at: e.updatedAt.toISOString(),
    };
  }

  // ─── Incoming Proposals ──────────────────────────────────

  /**
   * GET /organizer/proposals
   *
   * Returns paginated proposals for events owned by this organizer.
   * Includes nested sponsor and event info.
   */
  async getProposals(
    tenantId: string,
    organizerId: string | undefined,
    query: OrganizerProposalsQueryDto,
  ) {
    this.assertOrganizerId(organizerId);

    const { page, page_size, status, event_id } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      tenantId,
      isActive: true,
      sponsorship: {
        event: {
          organizerId,
          ...(event_id && { id: event_id }),
        },
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
          proposedTier: true,
          proposedAmount: true,
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
                select: { id: true, title: true },
              },
              company: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                  // contactEmail is not on Company — use first user's email
                },
              },
            },
          },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: data.map((p) => ({
        id: p.id,
        event_id: p.sponsorship.eventId,
        title: p.proposedTier || '',
        description: p.message || '',
        amount: p.proposedAmount ? Number(p.proposedAmount) : 0,
        currency: 'USD',
        status: p.status.toLowerCase(),
        sponsor: {
          id: p.sponsorship.company.id,
          name: p.sponsorship.company.name,
          logo_url: p.sponsorship.company.logoUrl || null,
          email: '', // Company doesn't store email directly
        },
        event: {
          id: p.sponsorship.event.id,
          title: p.sponsorship.event.title,
          slug: p.sponsorship.event.id,
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

  // ─── Single Proposal ──────────────────────────────────────

  /**
   * GET /organizer/proposals/:id
   *
   * Returns a single proposal for an event owned by this organizer.
   */
  async getProposalById(proposalId: string, tenantId: string, organizerId?: string) {
    this.assertOrganizerId(organizerId);

    const p = await this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId,
        isActive: true,
        sponsorship: { event: { organizerId } },
      },
      select: {
        id: true,
        status: true,
        proposedTier: true,
        proposedAmount: true,
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
            event: { select: { id: true, title: true } },
            company: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
    });

    if (!p) {
      throw new NotFoundException('Proposal not found');
    }

    return {
      id: p.id,
      event_id: p.sponsorship.eventId,
      title: p.proposedTier || '',
      description: p.message || '',
      amount: p.proposedAmount ? Number(p.proposedAmount) : 0,
      currency: 'USD',
      status: p.status.toLowerCase(),
      sponsor: {
        id: p.sponsorship.company.id,
        name: p.sponsorship.company.name,
        logo_url: p.sponsorship.company.logoUrl || null,
        email: '',
      },
      event: {
        id: p.sponsorship.event.id,
        title: p.sponsorship.event.title,
        slug: p.sponsorship.event.id,
      },
      submitted_at: p.submittedAt?.toISOString() || null,
      reviewed_at: p.reviewedAt?.toISOString() || null,
      reviewer_notes: p.notes || null,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    };
  }

  // ─── Review Proposal ─────────────────────────────────────

  /**
   * POST /organizer/proposals/:id/review
   *
   * Allows the organizer to approve or reject a proposal on their events.
   * - Validates ownership: proposal→sponsorship→event.organizerId === JWT organizer_id
   * - Maps action to ProposalStatus (approve → APPROVED, reject → REJECTED)
   * - Validates status transition (must be UNDER_REVIEW or SUBMITTED; auto-transitions SUBMITTED→UNDER_REVIEW→APPROVED/REJECTED)
   * - Records audit log and emits domain event
   */
  async reviewProposal(
    proposalId: string,
    dto: ReviewProposalDto,
    tenantId: string,
    organizerId: string | undefined,
    actorId: string,
  ) {
    this.assertOrganizerId(organizerId);

    // 1. Load proposal with full relationship chain for ownership check
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId, isActive: true },
      include: {
        sponsorship: {
          include: {
            event: { select: { id: true, organizerId: true, title: true } },
            company: {
              select: { id: true, name: true, logoUrl: true },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // 2. Ownership check: event must belong to this organizer
    if (proposal.sponsorship.event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only review proposals for your own events');
    }

    // 3. Map action to target status
    const targetStatus =
      dto.action === 'approve' ? ProposalStatus.APPROVED : ProposalStatus.REJECTED;

    // 4. Validate status transition
    // If currently SUBMITTED, auto-transition through UNDER_REVIEW first
    const currentStatus = proposal.status;
    const reviewableStatuses: ProposalStatus[] = [
      ProposalStatus.SUBMITTED,
      ProposalStatus.UNDER_REVIEW,
    ];

    if (!reviewableStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        `Cannot review a proposal with status "${currentStatus}". Only SUBMITTED or UNDER_REVIEW proposals can be reviewed.`,
      );
    }

    // 5. Update proposal
    const now = new Date();
    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: targetStatus,
        ...(dto.reviewer_notes !== undefined && { notes: dto.reviewer_notes }),
        reviewedAt: now,
        // If transitioning from SUBMITTED, also set submittedAt if not already set
        ...(!proposal.submittedAt && { submittedAt: now }),
      },
    });

    this.logger.log(
      `Proposal ${proposalId} reviewed: ${currentStatus} → ${targetStatus} by organizer ${organizerId}`,
    );

    // 6. Audit log
    this.auditLogService.log({
      tenantId,
      actorId,
      actorRole: 'ORGANIZER',
      action: 'proposal.status_changed',
      entityType: 'Proposal',
      entityId: proposalId,
      metadata: {
        previousStatus: currentStatus,
        newStatus: targetStatus,
        reviewAction: dto.action,
        reviewerNotes: dto.reviewer_notes,
      },
    });

    // 7. Domain event
    this.eventEmitter.emit(
      PROPOSAL_STATUS_CHANGED_EVENT,
      new ProposalStatusChangedEvent({
        proposalId,
        tenantId,
        actorId,
        actorRole: 'ORGANIZER',
        previousStatus: currentStatus,
        newStatus: targetStatus,
      }),
    );

    // 8. Invalidate proposal caches
    this.cacheService.delByPattern('proposals:list:*');

    // Return the updated proposal in the IncomingProposal shape
    return {
      id: updated.id,
      event_id: proposal.sponsorship.eventId,
      title: updated.proposedTier || '',
      description: updated.message || '',
      amount: updated.proposedAmount ? Number(updated.proposedAmount) : 0,
      currency: 'USD',
      status: updated.status.toLowerCase(),
      sponsor: {
        id: proposal.sponsorship.company.id,
        name: proposal.sponsorship.company.name,
        logo_url: proposal.sponsorship.company.logoUrl || null,
        email: '',
      },
      event: {
        id: proposal.sponsorship.event.id,
        title: proposal.sponsorship.event.title,
        slug: proposal.sponsorship.event.id,
      },
      submitted_at: updated.submittedAt?.toISOString() || null,
      reviewed_at: updated.reviewedAt?.toISOString() || null,
      reviewer_notes: updated.notes || null,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    };
  }
}
