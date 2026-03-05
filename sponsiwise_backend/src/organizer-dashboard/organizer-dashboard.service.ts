import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventStatus, ProposalStatus, SponsorshipStatus, TierType as PrismaTierType, GenderType, AgeBracket, IncomeBracket } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/providers/prisma.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { CacheService } from '../common/providers/cache.service';
import { ProposalStatusChangedEvent, PROPOSAL_STATUS_CHANGED_EVENT } from '../proposals/events';
import type { OrganizerEventsQueryDto, OrganizerProposalsQueryDto, ReviewProposalDto, CreateOrganizerEventDto, UpdateOrganizerEventDto } from './dto';

/**
 * OrganizerDashboardService — read-mostly aggregation layer for organizer-scoped data.
 *
 * Every method requires organizerId (resolved from JWT, never from request).
 * All queries are organizer-scoped.
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
  async getDashboardStats(organizerId?: string) {
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
        where: { organizerId, isActive: true },
      }),
      // Published events
      this.prisma.event.count({
        where: {
          organizerId,
          isActive: true,
          status: EventStatus.PUBLISHED,
        },
      }),
      // Total proposals received (on organizer's events)
      this.prisma.proposal.count({
        where: {
          isActive: true,
          sponsorship: { event: { organizerId } },
        },
      }),
      // Pending proposals (SUBMITTED or UNDER_MANAGER_REVIEW)
      this.prisma.proposal.count({
        where: {
          isActive: true,
          sponsorship: { event: { organizerId } },
          status: { in: [ProposalStatus.SUBMITTED, ProposalStatus.UNDER_MANAGER_REVIEW] },
        },
      }),
      // Approved proposals
      this.prisma.proposal.count({
        where: {
          isActive: true,
          sponsorship: { event: { organizerId } },
          status: ProposalStatus.APPROVED,
        },
      }),
    ]);

    // Sum approved proposal amounts as sponsorship revenue
    const revenueResult = await this.prisma.proposal.findMany({
      where: {
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

    // Validate predefined tier uniqueness if tiers provided
    if (dto.tiers && dto.tiers.length > 0) {
      const tierTypes = dto.tiers.map(t => t.tierType);
      const predefinedTypes = tierTypes.filter(t => t !== 'CUSTOM');
      const uniqueTypes = new Set(predefinedTypes);
      if (uniqueTypes.size !== predefinedTypes.length) {
        throw new BadRequestException('Duplicate predefined tier types are not allowed');
      }
    }

    // Use transaction to create event with address and tiers
    const event = await this.prisma.$transaction(async (tx) => {
      // Create the event
      const event = await tx.event.create({
        data: {
          title: dto.title,
          ...(dto.description !== undefined && { description: dto.description }),
          expectedFootfall: dto.expectedFootfall,
          startDate: start,
          endDate: end,
          status: EventStatus.UNDER_MANAGER_REVIEW,
          ...(dto.website !== undefined && { website: dto.website }),
          category: dto.category,
          ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
          ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
          ...(dto.pptDeckUrl !== undefined && { pptDeckUrl: dto.pptDeckUrl }),
          organizer: { connect: { id: organizerId } },
        },
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

      // Create sponsorship tiers if provided
      if (dto.tiers && dto.tiers.length > 0) {
        for (const tier of dto.tiers) {
          // Parse benefits array to JSON string
          const benefitsJson = tier.benefits ? JSON.stringify(tier.benefits) : '[]';
          
          await tx.sponsorshipTier.create({
            data: {
              eventId: event.id,
              tierType: tier.tierType as PrismaTierType,
              customName: tier.customName || null,
              askingPrice: tier.askingPrice,
              totalSlots: tier.totalSlots || 1,
              soldSlots: 0,
              isLocked: false,
              isActive: true,
              benefits: benefitsJson,
            },
          });
        }
      }

      // Create audience profile if provided
      const audienceProfile = await tx.eventAudienceProfile.create({
        data: {
          eventId: event.id,
        },
      });

      // Create gender distributions
      if (dto.audienceProfile?.genders && dto.audienceProfile.genders.length > 0) {
        for (const gender of dto.audienceProfile.genders) {
          await tx.audienceGender.create({
            data: {
              profileId: audienceProfile.id,
              gender: gender.gender as GenderType,
              percentage: gender.percentage,
            },
          });
        }
      }

      // Create age group distributions
      if (dto.audienceProfile?.ages && dto.audienceProfile.ages.length > 0) {
        for (const age of dto.audienceProfile.ages) {
          await tx.audienceAgeGroup.create({
            data: {
              profileId: audienceProfile.id,
              bracket: age.bracket as AgeBracket,
              percentage: age.percentage,
            },
          });
        }
      }

      // Create income group distributions
      if (dto.audienceProfile?.incomes && dto.audienceProfile.incomes.length > 0) {
        for (const income of dto.audienceProfile.incomes) {
          await tx.audienceIncomeGroup.create({
            data: {
              profileId: audienceProfile.id,
              bracket: income.bracket as IncomeBracket,
              percentage: income.percentage,
            },
          });
        }
      }

      // Create region distributions
      if (dto.audienceProfile?.regions && dto.audienceProfile.regions.length > 0) {
        for (const region of dto.audienceProfile.regions) {
          await tx.audienceRegionDistribution.create({
            data: {
              profileId: audienceProfile.id,
              city: region.city,
              state: region.state,
              percentage: region.percentage,
            },
          });
        }
      }

      return event;
    });

    this.logger.log(
      `Event ${event.id} created by organizer ${organizerId} in global tenant`,
    );

    // Invalidate event list caches
    this.cacheService.delByPattern('events:list:*');

    // Return the created event with address and tiers
    return this.getEventById(event.id, organizerId);
  }

  // ─── Events ──────────────────────────────────────────────

  /**
   * GET /organizer/events
   *
   * Returns paginated list of events owned by this organizer.
   * Includes proposal counts and sponsorship revenue per event.
   */
  async getEvents(
    organizerId: string | undefined,
    query: OrganizerEventsQueryDto,
  ) {
    this.assertOrganizerId(organizerId);

    const { page, page_size, status, search } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
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
          startDate: true,
          endDate: true,
          status: true,
          category: true,
          contactPhone: true,
          contactEmail: true,
          pptDeckUrl: true,
          expectedFootfall: true,
          createdAt: true,
          updatedAt: true,
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
              benefits: true,
              isLocked: true,
            },
          },
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
        // Aggregate proposal counts and revenue per event from sponsorships
        let totalProposals = 0;
        let pendingProposals = 0;
        let totalSponsorshipAmount = 0;

        for (const s of e.sponsorships) {
          for (const p of s.proposals) {
            totalProposals++;
            if (p.status === ProposalStatus.SUBMITTED || p.status === ProposalStatus.UNDER_MANAGER_REVIEW) {
              pendingProposals++;
            }
            if (p.status === ProposalStatus.APPROVED && p.proposedAmount) {
              totalSponsorshipAmount += Number(p.proposedAmount);
            }
          }
        }

        // Map tiers to sponsorship_tiers format
        const sponsorshipTiers = e.tiers.map((t) => {
          let benefits: string[] = [];
          try {
            benefits = JSON.parse(t.benefits || '[]');
          } catch {
            benefits = [];
          }

          return {
            id: t.id,
            tier_type: t.tierType.toLowerCase(),
            name: t.customName || t.tierType,
            asking_price: Number(t.askingPrice),
            total_slots: t.totalSlots,
            sold_slots: t.soldSlots,
            slots_available: t.totalSlots - t.soldSlots,
            benefits: benefits,
            is_locked: t.isLocked,
          };
        });

        return {
          id: e.id,
          title: e.title,
          slug: e.id,
          description: e.description || '',
          start_date: e.startDate.toISOString(),
          end_date: e.endDate.toISOString(),
          expected_footfall: e.expectedFootfall,
          status: e.status.toLowerCase(),
          website: '',
          logo_url: null,
          category: e.category || null,
          contact_phone: e.contactPhone || null,
          contact_email: e.contactEmail || null,
          ppt_deck_url: e.pptDeckUrl || null,
          address: e.address ? {
            address_line_1: e.address.addressLine1,
            address_line_2: e.address.addressLine2 || '',
            city: e.address.city,
            state: e.address.state,
            country: e.address.country,
            postal_code: e.address.postalCode,
          } : null,
          sponsorship_tiers: sponsorshipTiers,
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
  async getEventById(eventId: string, organizerId?: string) {
    this.assertOrganizerId(organizerId);

    const e = await this.prisma.event.findFirst({
      where: { id: eventId, organizerId, isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        website: true,
        status: true,
        expectedFootfall: true,
        category: true,
        contactPhone: true,
        contactEmail: true,
        pptDeckUrl: true,
        createdAt: true,
        updatedAt: true,
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
            benefits: true,
            isLocked: true,
          },
        },
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
        if (p.status === ProposalStatus.SUBMITTED || p.status === ProposalStatus.UNDER_MANAGER_REVIEW) {
          pendingProposals++;
        }
        if (p.status === ProposalStatus.APPROVED && p.proposedAmount) {
          totalSponsorshipAmount += Number(p.proposedAmount);
        }
      }
    }

    // Map tiers to sponsorship_tiers format
    const sponsorshipTiers = e.tiers.map((t) => {
      let benefits: string[] = [];
      try {
        benefits = JSON.parse(t.benefits || '[]');
      } catch {
        benefits = [];
      }

      return {
        id: t.id,
        tier_type: t.tierType.toLowerCase(),
        name: t.customName || t.tierType,
        asking_price: Number(t.askingPrice),
        total_slots: t.totalSlots,
        sold_slots: t.soldSlots,
        slots_available: t.totalSlots - t.soldSlots,
        benefits: benefits,
        is_locked: t.isLocked,
      };
    });

    return {
      id: e.id,
      title: e.title,
      slug: e.id,
      description: e.description || '',
      start_date: e.startDate.toISOString(),
      end_date: e.endDate.toISOString(),
      expected_footfall: e.expectedFootfall || 0,
      status: e.status.toLowerCase(),
      website: e.website || '',
      logo_url: null,
      category: e.category || null,
      contact_phone: e.contactPhone || null,
      contact_email: e.contactEmail || null,
      ppt_deck_url: e.pptDeckUrl || null,
      address: e.address ? {
        address_line_1: e.address.addressLine1,
        address_line_2: e.address.addressLine2 || '',
        city: e.address.city,
        state: e.address.state,
        country: e.address.country,
        postal_code: e.address.postalCode,
      } : null,
      sponsorship_tiers: sponsorshipTiers,
      total_proposals: totalProposals,
      pending_proposals: pendingProposals,
      total_sponsorship_amount: totalSponsorshipAmount,
      currency: 'USD',
      created_at: e.createdAt.toISOString(),
      updated_at: e.updatedAt.toISOString(),
    };
  }

  // ─── Event Update Action ──────────────────────────

  /**
   * PATCH /organizer/events/:id
   * 
   * Updates an event owned by this organizer.
   * Organizers cannot edit tiers that are locked.
   */
  async updateEvent(
    eventId: string,
    dto: UpdateOrganizerEventDto,
    organizerId?: string,
  ) {
    this.assertOrganizerId(organizerId);

    // Load event with tiers
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizerId, isActive: true },
      include: { address: true, tiers: { where: { isActive: true } } },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if dates are valid
    if (dto.startDate || dto.endDate) {
      const start = new Date(dto.startDate || event.startDate);
      const end = new Date(dto.endDate || event.endDate);
      if (end <= start) {
        throw new BadRequestException('endDate must be after startDate');
      }
    }

    // Validate predefined tier uniqueness if tiers are being updated
    if (dto.tiers && dto.tiers.length > 0) {
      const tierTypes = dto.tiers
        .filter(t => t.tierType && t.tierType !== 'CUSTOM')
        .map(t => t.tierType);
      const uniqueTypes = new Set(tierTypes);
      if (uniqueTypes.size !== tierTypes.length) {
        throw new BadRequestException('Duplicate predefined tier types are not allowed');
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

            // SECURITY: Organizers cannot modify locked tiers
            if (existing.isLocked) {
              existingTiersMap.delete(tierDto.id);
              continue;
            }

            // Slot safety validation
            if (tierDto.totalSlots !== undefined && tierDto.totalSlots < existing.soldSlots) {
              throw new BadRequestException(`Cannot reduce total slots for tier ${existing.tierType} below already sold slots (${existing.soldSlots})`);
            }

            // Build update data
            const tierUpdateData: any = {};
            if (tierDto.askingPrice !== undefined) tierUpdateData.askingPrice = tierDto.askingPrice;
            if (tierDto.totalSlots !== undefined) tierUpdateData.totalSlots = tierDto.totalSlots;
            if (tierDto.customName !== undefined) tierUpdateData.customName = tierDto.customName;
            if (tierDto.benefits !== undefined) {
              tierUpdateData.benefits = JSON.stringify(tierDto.benefits);
            }

            await tx.sponsorshipTier.update({
              where: { id: tierDto.id },
              data: tierUpdateData,
            });
            existingTiersMap.delete(tierDto.id);
          } else if (tierDto.tierType && tierDto.askingPrice !== undefined) {
            // Create new tier
            const benefitsJson = tierDto.benefits ? JSON.stringify(tierDto.benefits) : '[]';
            
            await tx.sponsorshipTier.create({
              data: {
                eventId,
                tierType: tierDto.tierType as any,
                customName: tierDto.customName || null,
                askingPrice: tierDto.askingPrice,
                totalSlots: tierDto.totalSlots ?? 1,
                soldSlots: 0,
                isLocked: false,
                isActive: true,
                benefits: benefitsJson,
              },
            });
          }
        }

        // Soft delete remaining tiers that weren't included in the update payload
        // BUT ONLY if they are not locked. Organizers cannot delete locked tiers!
        for (const [id, t] of existingTiersMap) {
          if (!t.isLocked) {
            await tx.sponsorshipTier.update({
              where: { id },
              data: { isActive: false },
            });
          }
        }
      }

      return savedEvent;
    });

    this.logger.log(`Event ${eventId} updated by organizer ${organizerId}`);

    // Invalidate caches
    this.cacheService.delByPattern('events:list:*');

    // Return the updated event
    return this.getEventById(eventId, organizerId);
  }

  // ─── Incoming Proposals ──────────────────────────────────

  /**
   * GET /organizer/proposals
   *
   * Returns paginated proposals for events owned by this organizer.
   * Includes nested sponsor and event info.
   */
  async getProposals(
    organizerId: string | undefined,
    query: OrganizerProposalsQueryDto,
  ) {
    this.assertOrganizerId(organizerId);

    const { page, page_size, status, event_id } = query;
    const skip = (page - 1) * page_size;

    const where: any = {
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
                  // logoUrl removed from schema
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
          logo_url: null,
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
  async getProposalById(proposalId: string, organizerId?: string) {
    this.assertOrganizerId(organizerId);

    const p = await this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
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
            company: { select: { id: true, name: true } },
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
        logo_url: null,
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
   * - Validates status transition (must be UNDER_MANAGER_REVIEW or SUBMITTED; auto-transitions SUBMITTED→UNDER_MANAGER_REVIEW→APPROVED/REJECTED)
   * - Records audit log and emits domain event
   */
  async reviewProposal(
    proposalId: string,
    dto: ReviewProposalDto,
    organizerId: string | undefined,
    actorId: string,
  ) {
    this.assertOrganizerId(organizerId);

    // 1. Load proposal with full relationship chain for ownership check
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, isActive: true },
      include: {
        sponsorship: {
          include: {
            event: { select: { id: true, organizerId: true, title: true } },
            company: {
              select: { id: true, name: true },
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
    // If currently SUBMITTED, auto-transition through UNDER_MANAGER_REVIEW first
    const currentStatus = proposal.status;
    const reviewableStatuses: ProposalStatus[] = [
      ProposalStatus.SUBMITTED,
      ProposalStatus.UNDER_MANAGER_REVIEW,
    ];

    if (!reviewableStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        `Cannot review a proposal with status "${currentStatus}". Only SUBMITTED or UNDER_MANAGER_REVIEW proposals can be reviewed.`,
      );
    }

    // 5. Use transaction for atomic proposal update + slot increment (on approval)
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      // Update proposal status
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          status: targetStatus,
          ...(dto.reviewer_notes !== undefined && { notes: dto.reviewer_notes }),
          reviewedAt: now,
          // If transitioning from SUBMITTED, also set submittedAt if not already set
          ...(!proposal.submittedAt && { submittedAt: now }),
        },
      });

      // INVENTORY: If APPROVED, atomically increment soldSlots on the tier
      if (targetStatus === ProposalStatus.APPROVED && proposal.tierId) {
        // Re-check tier availability inside transaction to prevent race conditions
        const tier = await tx.sponsorshipTier.findUnique({
          where: { id: proposal.tierId },
        });

        if (!tier) {
          throw new BadRequestException('Referenced sponsorship tier no longer exists');
        }

        if (tier.soldSlots >= tier.totalSlots) {
          throw new BadRequestException(
            `Cannot approve: tier "${tier.tierType}" is sold out (${tier.soldSlots}/${tier.totalSlots} slots used)`,
          );
        }

        // Atomic increment using Prisma's increment operation
        await tx.sponsorshipTier.update({
          where: { id: proposal.tierId },
          data: { soldSlots: { increment: 1 } },
        });

        this.logger.log(
          `Tier ${tier.tierType} slot sold: ${tier.soldSlots + 1}/${tier.totalSlots} for event ${proposal.sponsorship.eventId}`,
        );

        // Also update the sponsorship status to ACTIVE
        await tx.sponsorship.update({
          where: { id: proposal.sponsorshipId },
          data: {
            status: SponsorshipStatus.ACTIVE,
            tier: tier.tierType,
          },
        });
      }

      // If REJECTED, update sponsorship status to CANCELLED
      if (targetStatus === ProposalStatus.REJECTED) {
        await tx.sponsorship.update({
          where: { id: proposal.sponsorshipId },
          data: { status: SponsorshipStatus.CANCELLED },
        });
      }

      return updatedProposal;
    });

    this.logger.log(
      `Proposal ${proposalId} reviewed: ${currentStatus} → ${targetStatus} by organizer ${organizerId}`,
    );

    // 6. Audit log — proposal status change
    this.auditLogService.log({
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

    // 6b. If approved and tier exists, also log the slot sale
    if (targetStatus === ProposalStatus.APPROVED && proposal.tierId) {
      this.auditLogService.log({
        actorId,
        actorRole: 'ORGANIZER',
        action: 'tier.slot_sold',
        entityType: 'SponsorshipTier',
        entityId: proposal.tierId,
        metadata: {
          proposalId,
          eventId: proposal.sponsorship.eventId,
          companyId: proposal.sponsorship.company.id,
          companyName: proposal.sponsorship.company.name,
        },
      });
    }

    // 7. Domain event
    this.eventEmitter.emit(
      PROPOSAL_STATUS_CHANGED_EVENT,
      new ProposalStatusChangedEvent({
        proposalId,
        actorId,
        actorRole: 'ORGANIZER',
        previousStatus: currentStatus,
        newStatus: targetStatus,
      }),
    );

    // 8. Invalidate caches
    this.cacheService.delByPattern('proposals:list:*');
    this.cacheService.delByPattern('events:list:*');
    this.cacheService.delByPattern('sponsor:dashboard:*');

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
        logo_url: null,
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

