import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { EventStatus, VerificationStatus, SponsorshipStatus, ProposalStatus } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';
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
 * All queries are tenant-scoped AND company-scoped.
 */
@Injectable()
export class SponsorService {
  private readonly logger = new Logger(SponsorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
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

  async getDashboardStats(tenantId: string, companyId?: string) {
    this.assertCompanyId(companyId);

    const cacheKey = CacheService.key('sponsor', 'dashboard', tenantId, companyId);
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
          tenantId,
          isActive: true,
          sponsorship: { companyId },
        },
      }),
      this.prisma.proposal.count({
        where: {
          tenantId,
          isActive: true,
          sponsorship: { companyId },
          status: ProposalStatus.SUBMITTED,
        },
      }),
      this.prisma.proposal.count({
        where: {
          tenantId,
          isActive: true,
          sponsorship: { companyId },
          status: ProposalStatus.APPROVED,
        },
      }),
      this.prisma.proposal.count({
        where: {
          tenantId,
          isActive: true,
          sponsorship: { companyId },
          status: ProposalStatus.REJECTED,
        },
      }),
      this.prisma.sponsorship.count({
        where: {
          tenantId,
          companyId,
          isActive: true,
          status: SponsorshipStatus.ACTIVE,
        },
      }),
    ]);

    // Sum the proposed amounts from active sponsorships
    const totalInvestedResult = await this.prisma.sponsorship.findMany({
      where: {
        tenantId,
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

  async getEvents(tenantId: string, companyId: string | undefined, query: SponsorEventsQueryDto) {
    this.assertCompanyId(companyId);

    const { page, page_size, search } = query;
    const skip = (page - 1) * page_size;

    // Get event IDs already sponsored by this company
    const existingSponsorships = await this.prisma.sponsorship.findMany({
      where: { companyId, isActive: true },
      select: { eventId: true },
    });
    const sponsoredEventIds = existingSponsorships.map((s) => s.eventId);

    // Build where clause
    const where: any = {
      tenantId,
      isActive: true,
      status: EventStatus.PUBLISHED,
      verificationStatus: VerificationStatus.VERIFIED,
      ...(sponsoredEventIds.length > 0 && {
        id: { notIn: sponsoredEventIds },
      }),
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
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          startDate: true,
          endDate: true,
          expectedFootfall: true,
          logoUrl: true,
          organizer: {
            select: { id: true, name: true, logoUrl: true },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: data.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.id,
        description: e.description || '',
        start_date: e.startDate.toISOString(),
        end_date: e.endDate.toISOString(),
        location: e.location || '',
        expected_footfall: e.expectedFootfall ?? 0,
        image_url: e.logoUrl || null,
        category: '',
        status: 'published',
        organizer: {
          id: e.organizer.id,
          name: e.organizer.name,
          logo_url: e.organizer.logoUrl || null,
        },
        sponsorship_tiers: [],
        tags: [],
      })),
      total,
      page,
      page_size,
    };
  }

  // ─── Proposals ───────────────────────────────────────────

  async getProposals(
    tenantId: string,
    companyId: string | undefined,
    query: SponsorProposalsQueryDto,
  ) {
    this.assertCompanyId(companyId);

    const { page, page_size, status, eventId } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      tenantId,
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
                  location: true,
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
          location: p.sponsorship.event.location || '',
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
    tenantId: string,
    companyId: string | undefined,
    query: SponsorSponsorshipsQueryDto,
  ) {
    this.assertCompanyId(companyId);

    const { page, page_size, status } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
      tenantId,
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
              location: true,
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
      data: data.map((s) => {
        const amount = s.proposals.reduce(
          (sum, p) => sum + (p.proposedAmount ? Number(p.proposedAmount) : 0),
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
            location: s.event.location || '',
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

  async getEventById(tenantId: string, companyId: string | undefined, eventId: string) {
    this.assertCompanyId(companyId);

    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        isActive: true,
        status: EventStatus.PUBLISHED,
        verificationStatus: VerificationStatus.VERIFIED,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startDate: true,
        endDate: true,
        expectedFootfall: true,
        logoUrl: true,
        organizer: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      id: event.id,
      title: event.title,
      slug: event.id,
      description: event.description || '',
      start_date: event.startDate.toISOString(),
      end_date: event.endDate.toISOString(),
      location: event.location || '',
      expected_footfall: event.expectedFootfall ?? 0,
      image_url: event.logoUrl || null,
      category: '',
      status: 'published',
      organizer: {
        id: event.organizer.id,
        name: event.organizer.name,
        logo_url: event.organizer.logoUrl || null,
      },
      sponsorship_tiers: [],
      tags: [],
    };
  }

  // ─── Single Proposal Detail ─────────────────────────────────

  async getProposalById(tenantId: string, companyId: string | undefined, proposalId: string) {
    this.assertCompanyId(companyId);

    const proposal = await this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId,
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
                location: true,
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
        location: proposal.sponsorship.event.location || '',
      },
      submitted_at: proposal.submittedAt?.toISOString() || null,
      reviewed_at: proposal.reviewedAt?.toISOString() || null,
      reviewer_notes: proposal.notes || null,
      created_at: proposal.createdAt.toISOString(),
      updated_at: proposal.updatedAt.toISOString(),
    };
  }

  // ─── Create Proposal ────────────────────────────────────────

  async createProposal(tenantId: string, companyId: string | undefined, dto: CreateProposalDto) {
    this.assertCompanyId(companyId);

    // Verify the event exists, is published, and verified
    const event = await this.prisma.event.findFirst({
      where: {
        id: dto.eventId,
        tenantId,
        isActive: true,
        status: EventStatus.PUBLISHED,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found or not available for sponsorship');
    }

    // Create or find existing sponsorship, then create proposal in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert: find existing sponsorship or create one
      let sponsorship = await tx.sponsorship.findFirst({
        where: {
          companyId,
          eventId: dto.eventId,
          tenantId,
        },
      });

      if (!sponsorship) {
        sponsorship = await tx.sponsorship.create({
          data: {
            companyId,
            eventId: dto.eventId,
            tenantId,
            status: SponsorshipStatus.PENDING,
            tier: dto.proposedTier || null,
          },
        });
      }

      // Create the proposal
      const proposal = await tx.proposal.create({
        data: {
          sponsorshipId: sponsorship.id,
          tenantId,
          proposedAmount: dto.proposedAmount ?? null,
          proposedTier: dto.proposedTier ?? null,
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
          sponsorship: {
            select: {
              id: true,
              eventId: true,
              event: {
                select: {
                  id: true,
                  title: true,
                  startDate: true,
                  location: true,
                },
              },
            },
          },
        },
      });

      return proposal;
    });

    return {
      id: result.id,
      event_id: result.sponsorship.eventId,
      sponsorship_id: result.sponsorship.id,
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
        location: result.sponsorship.event.location || '',
      },
      submitted_at: result.submittedAt?.toISOString() || null,
      reviewed_at: null,
      reviewer_notes: null,
      created_at: result.createdAt.toISOString(),
      updated_at: result.updatedAt.toISOString(),
    };
  }

  // ─── Withdraw Proposal ──────────────────────────────────────

  async withdrawProposal(tenantId: string, companyId: string | undefined, proposalId: string) {
    this.assertCompanyId(companyId);

    const proposal = await this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId,
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
                location: true,
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
        location: updated.sponsorship.event.location || '',
      },
      submitted_at: updated.submittedAt?.toISOString() || null,
      reviewed_at: null,
      reviewer_notes: null,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    };
  }
}
