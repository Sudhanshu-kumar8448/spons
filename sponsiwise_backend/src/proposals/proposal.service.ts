import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Proposal } from '@prisma/client';
import { Role, ProposalStatus } from '@prisma/client';
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
 * Rules:
 *  - Proposal belongs to exactly one Sponsorship
 *  - tenantId is derived from the Sponsorship, never trusted from request
 *  - Sponsorship must exist before a proposal can be created
 *  - ADMIN can create / update / list proposals within their own tenant
 *  - USER  can only view proposals within their own tenant
 *  - SUPER_ADMIN can view / manage all proposals across all tenants
 *  - Status workflow: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED
 *  - A proposal can be WITHDRAWN from any pre-approved state
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
   * - Sponsorship must exist and be accessible by the caller's tenant
   * - tenantId is derived from the Sponsorship
   * - ADMIN: sponsorship must be within their own tenant
   * - SUPER_ADMIN: any sponsorship
   */
  async create(
    dto: CreateProposalDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Proposal> {
    // 1. Validate sponsorship exists and enforce tenant access
    const sponsorship = await this.validateSponsorship(
      dto.sponsorshipId,
      callerRole,
      callerTenantId,
    );

    // 2. Derive tenantId from sponsorship
    const tenantId = sponsorship.tenantId;

    // 3. Set submittedAt if status is SUBMITTED or beyond
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
      tenant: { connect: { id: tenantId } },
      sponsorship: { connect: { id: dto.sponsorshipId } },
    });

    this.logger.log(
      `Proposal ${proposal.id} created for sponsorship ${dto.sponsorshipId} in tenant ${tenantId}`,
    );

    // Fire-and-forget audit log — never blocks the response
    this.auditLogService.log({
      tenantId,
      actorId: callerTenantId, // caller's ID used as actor
      actorRole: callerRole,
      action: 'proposal.created',
      entityType: 'Proposal',
      entityId: proposal.id,
      metadata: {
        sponsorshipId: dto.sponsorshipId,
        status: proposal.status,
        proposedAmount: dto.proposedAmount,
      },
    });

    // Emit domain event — after DB write, before return
    this.eventEmitter.emit(
      PROPOSAL_CREATED_EVENT,
      new ProposalCreatedEvent({
        proposalId: proposal.id,
        tenantId,
        actorId: callerTenantId,
        actorRole: callerRole,
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
   * - USER / ADMIN: must be within their own tenant
   * - SUPER_ADMIN: any tenant
   */
  async findById(proposalId: string, callerRole: Role, callerTenantId: string): Promise<Proposal> {
    let proposal: Proposal | null;

    if (callerRole === Role.SUPER_ADMIN) {
      proposal = await this.proposalRepository.findById(proposalId);
    } else {
      proposal = await this.proposalRepository.findByIdAndTenant(proposalId, callerTenantId);
    }

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return proposal;
  }

  /**
   * List proposals.
   * - USER / ADMIN: scoped to their own tenant
   * - SUPER_ADMIN: across all tenants
   */
  async findAll(
    query: ListProposalsQueryDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<{
    data: Proposal[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build a deterministic cache key from query params
    const scope = callerRole === Role.SUPER_ADMIN ? 'global' : `tenant:${callerTenantId}`;
    const cacheKey = CacheService.key(
      'proposals',
      'list',
      scope,
      `p${page}`,
      `l${limit}`,
      `s${query.status ?? 'any'}`,
      `sp${query.sponsorshipId ?? 'any'}`,
      `a${query.isActive ?? 'any'}`,
    );

    // Try cache first
    const cached = await this.cacheService.get<{ data: Proposal[]; total: number }>(cacheKey);
    if (cached) {
      return { ...cached, page, limit };
    }

    let result: { data: Proposal[]; total: number };

    if (callerRole === Role.SUPER_ADMIN) {
      result = await this.proposalRepository.findAll({
        skip,
        take: limit,
        status: query.status,
        sponsorshipId: query.sponsorshipId,
        isActive: query.isActive,
      });
    } else {
      result = await this.proposalRepository.findByTenant({
        tenantId: callerTenantId,
        skip,
        take: limit,
        status: query.status,
        sponsorshipId: query.sponsorshipId,
        isActive: query.isActive,
      });
    }

    // Populate cache (60s TTL)
    this.cacheService.set(cacheKey, result, 60);

    return { ...result, page, limit };
  }

  // ─── UPDATE ──────────────────────────────────────────────

  /**
   * Update a proposal.
   * - ADMIN: within their own tenant
   * - SUPER_ADMIN: any tenant
   *
   * sponsorshipId and tenantId are immutable after creation.
   * Status transitions are validated.
   */
  async update(
    proposalId: string,
    dto: UpdateProposalDto,
    callerRole: Role,
    callerTenantId: string,
  ): Promise<Proposal> {
    // Ensure the proposal exists and is within the caller's tenant
    const existing = await this.findById(proposalId, callerRole, callerTenantId);

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

    let proposal: Proposal;

    if (callerRole === Role.SUPER_ADMIN) {
      proposal = await this.proposalRepository.updateById(proposalId, data);
    } else {
      proposal = await this.proposalRepository.updateByIdAndTenant(
        proposalId,
        callerTenantId,
        data,
      );
    }

    this.logger.log(`Proposal ${proposalId} updated by ${callerRole} (tenant: ${callerTenantId})`);

    // Fire-and-forget audit log — never blocks the response
    this.auditLogService.log({
      tenantId: existing.tenantId,
      actorId: callerTenantId,
      actorRole: callerRole,
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
          tenantId: existing.tenantId,
          actorId: callerTenantId,
          actorRole: callerRole,
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
   * Validate that the Sponsorship exists and the caller has access.
   *
   * Throws NotFoundException if sponsorship doesn't exist.
   * Throws ForbiddenException if cross-tenant access.
   */
  private async validateSponsorship(
    sponsorshipId: string,
    callerRole: Role,
    callerTenantId: string,
  ) {
    const sponsorship = await this.sponsorshipRepository.findById(sponsorshipId);

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    // For non-super-admins, the sponsorship must be in the caller's tenant
    if (callerRole !== Role.SUPER_ADMIN) {
      if (sponsorship.tenantId !== callerTenantId) {
        throw new ForbiddenException(
          'Cannot create proposals for sponsorships outside your tenant',
        );
      }
    }

    return sponsorship;
  }

  /**
   * Validate proposal status transitions.
   *
   * Allowed transitions:
   *  DRAFT        → SUBMITTED, WITHDRAWN
   *  SUBMITTED    → UNDER_REVIEW, WITHDRAWN
   *  UNDER_REVIEW → APPROVED, REJECTED, WITHDRAWN
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
      [ProposalStatus.SUBMITTED]: [ProposalStatus.UNDER_REVIEW, ProposalStatus.WITHDRAWN],
      [ProposalStatus.UNDER_REVIEW]: [
        ProposalStatus.APPROVED,
        ProposalStatus.REJECTED,
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
