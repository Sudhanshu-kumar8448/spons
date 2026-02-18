import type { ProposalStatus } from '@prisma/client';

/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls
 * to avoid magic strings.
 */
export const PROPOSAL_CREATED_EVENT = 'proposal.created';

/**
 * Domain event emitted after a new proposal is successfully persisted.
 *
 * Carries the full actor + tenant context so that any future listener
 * (notification worker, analytics, webhook dispatcher) has everything
 * it needs without querying the database again.
 *
 * Example payload:
 * ```json
 * {
 *   "proposalId": "clxyz123...",
 *   "tenantId": "tenant_abc",
 *   "actorId": "user_456",
 *   "actorRole": "ADMIN",
 *   "newStatus": "DRAFT",
 *   "sponsorshipId": "spon_789",
 *   "proposedAmount": 5000,
 *   "timestamp": "2026-02-09T13:15:00.000Z"
 * }
 * ```
 */
export class ProposalCreatedEvent {
  /** Event name — matches the constant for easy filtering */
  readonly event = PROPOSAL_CREATED_EVENT;

  /** ID of the newly created proposal */
  readonly proposalId: string;

  /** Tenant the proposal belongs to */
  readonly tenantId: string;

  /** User who created the proposal */
  readonly actorId: string;

  /** Role of the actor at the time of creation */
  readonly actorRole: string;

  /** Initial status of the proposal (typically DRAFT) */
  readonly newStatus: ProposalStatus;

  /** Sponsorship this proposal targets */
  readonly sponsorshipId: string;

  /** Proposed sponsorship amount (if provided) */
  readonly proposedAmount?: number;

  /** ISO-8601 timestamp of when the event occurred */
  readonly timestamp: string;

  constructor(params: {
    proposalId: string;
    tenantId: string;
    actorId: string;
    actorRole: string;
    newStatus: ProposalStatus;
    sponsorshipId: string;
    proposedAmount?: number;
  }) {
    this.proposalId = params.proposalId;
    this.tenantId = params.tenantId;
    this.actorId = params.actorId;
    this.actorRole = params.actorRole;
    this.newStatus = params.newStatus;
    this.sponsorshipId = params.sponsorshipId;
    this.proposedAmount = params.proposedAmount;
    this.timestamp = new Date().toISOString();
  }
}
