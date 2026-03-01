import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Proposal } from '@prisma/client';
import { ProposalStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProposalRepository } from './proposal.repository';
import { SponsorshipRepository } from '../sponsorships/sponsorship.repository';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { CacheService } from '../common/providers/cache.service';
import {
  ProposalCreatedEvent,
  PROPOSAL_CREATED_EVENT,
  ProposalStatusChangedEvent,
  PROPOSAL_STATUS_CHANGED_EVENT,
} from './events';
import { CreateProposalDto, UpdateProposalDto, ListProposalsQueryDto } from './dto';

/**
 * ProposalService — business logic for proposal management.
 *
 * Status workflow: DRAFT → SUBMITTED → UNDER_MANAGER_REVIEW → APPROVED / REJECTED
 */
@Injectable()
export class ProposalService {
  private readonly logger = new Logger(ProposalService.name);

  constructor(
    private readonly proposalRepository: ProposalRepository,
    private readonly sponsorshipRepository: SponsorshipRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  // ─── CREATE ──────────────────────────────────────────────

  /**
   * Create a new proposal.
   * Sponsorship must exist.
   */
  async create(dto: CreateProposalDto, actorId?: string, actorRole?: string): Promise<Proposal> {
    // 1. Validate sponsorship exists
    await this.validateSponsorship(dto.sponsorshipId);

    // 2. Set submittedAt if status is SUBMITTED or beyond
    const submittedAt = dto.status && dto.status !== ProposalStatus.DRAFT ? new Date() : undefined;

    const proposal = await this.proposalRepository.create({
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.proposedTier !== undefined && { proposedTier: dto.proposedTier }),
      ...(dto.proposedAmount !== undefined && {
        proposedAmount: dto.proposedAmount,
      }),
      ...(dto.message !== undefined && { message: dto.message }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(submittedAt !== undefined && { submittedAt }),
      sponsorship: { connect: { id: dto.sponsorshipId } },
    });

    this.logger.log(
      `Proposal ${proposal.id} created for sponsorship ${dto.sponsorshipId}`,
    );

    // Fire-and-forget audit log
    this.auditLogService.log({
      actorId: actorId || 'system',
      actorRole: actorRole || 'SYSTEM',
      action: 'proposal.created',
      entityType: 'Proposal',
      entityId: proposal.id,
      metadata: {
        sponsorshipId: dto.sponsorshipId,
        status: proposal.status,
        proposedAmount: dto.proposedAmount,
      },
    });

    // Emit domain event
    this.eventEmitter.emit(
      PROPOSAL_CREATED_EVENT,
      new ProposalCreatedEvent({
        proposalId: proposal.id,
        actorId: actorId || 'system',
        actorRole: actorRole || 'SYSTEM',
        newStatus: proposal.status,
        sponsorshipId: dto.sponsorshipId,
        proposedAmount: dto.proposedAmount ? Number(dto.proposedAmount) : undefined,
      }),
    );

    // Invalidate proposal list caches
    this.cacheService.delByPattern('proposals:list:*');

    return proposal;
  }

  // ─── READ ────────────────────────────────────────────────

  /**
   * Get a single proposal by ID.
   */
  async findById(proposalId: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findById(proposalId);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return proposal;
  }

  /**
   * List proposals with optional filters.
   */
  async findAll(query: ListProposalsQueryDto): Promise<{
    data: Proposal[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const cacheKey = CacheService.key(
      'proposals',
      'list',
      `p${page}`,
      `l${limit}`,
      `s${query.status ?? 'any'}`,
      `sp${query.sponsorshipId ?? 'any'}`,
      `a${query.isActive ?? 'any'}`,
    );

    const cached = await this.cacheService.get<{ data: Proposal[]; total: number }>(cacheKey);
    if (cached) {
      return { ...cached, page, limit };
    }

    const result = await this.proposalRepository.findAll({
      skip,
      take: limit,
      status: query.status,
      sponsorshipId: query.sponsorshipId,
      isActive: query.isActive,
    });

    this.cacheService.set(cacheKey, result, 60);

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a proposal.
   * Status transitions are validated.
   */
  async update(proposalId: string, dto: UpdateProposalDto, actorId?: string, actorRole?: string): Promise<Proposal> {
    const existing = await this.findById(proposalId);

    // Validate status transition if status is being changed
    if (dto.status !== undefined) {
      this.validateStatusTransition(existing.status, dto.status);
    }

    // Determine timestamp updates
    const timestampUpdates: Record<string, Date> = {};
    if (dto.status === ProposalStatus.SUBMITTED && !existing.submittedAt) {
      timestampUpdates.submittedAt = new Date();
    }
    if (dto.status === ProposalStatus.APPROVED || dto.status === ProposalStatus.REJECTED) {
      timestampUpdates.reviewedAt = new Date();
    }

    const data = {
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.proposedTier !== undefined && { proposedTier: dto.proposedTier }),
      ...(dto.proposedAmount !== undefined && {
        proposedAmount: dto.proposedAmount,
      }),
      ...(dto.message !== undefined && { message: dto.message }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...timestampUpdates,
    };

    const proposal = await this.proposalRepository.updateById(proposalId, data);

    this.logger.log(`Proposal ${proposalId} updated`);

    // Fire-and-forget audit log
    this.auditLogService.log({
      actorId: actorId || 'system',
      actorRole: actorRole || 'SYSTEM',
      action: dto.status ? 'proposal.status_changed' : 'proposal.updated',
      entityType: 'Proposal',
      entityId: proposalId,
      metadata: {
        ...(dto.status && {
          previousStatus: existing.status,
          newStatus: dto.status,
        }),
        changes: Object.keys(dto),
      },
    });

    // Emit domain event for status transitions only
    if (dto.status && dto.status !== existing.status) {
      this.eventEmitter.emit(
        PROPOSAL_STATUS_CHANGED_EVENT,
        new ProposalStatusChangedEvent({
          proposalId,
          actorId: actorId || 'system',
          actorRole: actorRole || 'SYSTEM',
          previousStatus: existing.status,
          newStatus: dto.status,
        }),
      );
    }

    // Invalidate proposal list caches
    this.cacheService.delByPattern('proposals:list:*');

    return proposal;
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────

  /**
   * Validate that the Sponsorship exists.
   * Throws NotFoundException if sponsorship doesn't exist.
   */
  private async validateSponsorship(sponsorshipId: string) {
    const sponsorship = await this.sponsorshipRepository.findById(sponsorshipId);

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    return sponsorship;
  }

  /**
   * Validate proposal status transitions.
   *
   * Allowed transitions:
   *  DRAFT        → SUBMITTED, WITHDRAWN
   *  SUBMITTED    → UNDER_MANAGER_REVIEW, WITHDRAWN
   *  UNDER_MANAGER_REVIEW → APPROVED, REJECTED, WITHDRAWN
   *  APPROVED     → (terminal — no further transitions)
   *  REJECTED     → (terminal — no further transitions)
   *  WITHDRAWN    → (terminal — no further transitions)
   */
  private validateStatusTransition(currentStatus: ProposalStatus, newStatus: ProposalStatus): void {
    if (currentStatus === newStatus) {
      return; // No-op transition is always allowed
    }

    const allowedTransitions: Record<ProposalStatus, ProposalStatus[]> = {
      [ProposalStatus.DRAFT]: [ProposalStatus.SUBMITTED, ProposalStatus.WITHDRAWN],
      [ProposalStatus.SUBMITTED]: [ProposalStatus.UNDER_MANAGER_REVIEW, ProposalStatus.WITHDRAWN],
      [ProposalStatus.UNDER_MANAGER_REVIEW]: [
        ProposalStatus.APPROVED,
        ProposalStatus.REJECTED,
        ProposalStatus.WITHDRAWN,
        ProposalStatus.FORWARDED_TO_ORGANIZER,
        ProposalStatus.REQUEST_CHANGES,
      ],
      [ProposalStatus.FORWARDED_TO_ORGANIZER]: [
        ProposalStatus.APPROVED,
        ProposalStatus.REJECTED,
        ProposalStatus.REQUEST_CHANGES,
        ProposalStatus.WITHDRAWN,
      ],
      [ProposalStatus.REQUEST_CHANGES]: [
        ProposalStatus.SUBMITTED,
        ProposalStatus.WITHDRAWN,
      ],
      [ProposalStatus.APPROVED]: [],
      [ProposalStatus.REJECTED]: [],
      [ProposalStatus.WITHDRAWN]: [],
    };

    const allowed = allowedTransitions[currentStatus];

    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition proposal from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
