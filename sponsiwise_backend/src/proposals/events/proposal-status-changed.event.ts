import type { ProposalStatus } from '@prisma/client';

/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls
 * to avoid magic strings.
 */
export const PROPOSAL_STATUS_CHANGED_EVENT = 'proposal.status_changed';

/**
 * Domain event emitted after a proposal's status is successfully transitioned.
 *
 * Carries previous + new status so listeners can react to specific transitions
 * (e.g. "send notification when APPROVED", "trigger webhook on REJECTED").
 *
 * Example payload:
 * ```json
 * {
 *   "proposalId": "clxyz123...",
 *   "tenantId": "tenant_abc",
 *   "actorId": "user_456",
 *   "actorRole": "ADMIN",
 *   "previousStatus": "UNDER_REVIEW",
 *   "newStatus": "APPROVED",
 *   "timestamp": "2026-02-09T13:20:00.000Z"
 * }
 * ```
 */
export class ProposalStatusChangedEvent {
  /** Event name — matches the constant for easy filtering */
  readonly event = PROPOSAL_STATUS_CHANGED_EVENT;

  /** ID of the proposal whose status changed */
  readonly proposalId: string;

  /** Tenant the proposal belongs to */
  readonly tenantId: string;

  /** User who triggered the status change */
  readonly actorId: string;

  /** Role of the actor at the time of the change */
  readonly actorRole: string;

  /** Status before the transition */
  readonly previousStatus: ProposalStatus;

  /** Status after the transition */
  readonly newStatus: ProposalStatus;

  /** ISO-8601 timestamp of when the event occurred */
  readonly timestamp: string;

  constructor(params: {
    proposalId: string;
    tenantId: string;
    actorId: string;
    actorRole: string;
    previousStatus: ProposalStatus;
    newStatus: ProposalStatus;
  }) {
    this.proposalId = params.proposalId;
    this.tenantId = params.tenantId;
    this.actorId = params.actorId;
    this.actorRole = params.actorRole;
    this.previousStatus = params.previousStatus;
    this.newStatus = params.newStatus;
    this.timestamp = new Date().toISOString();
  }
}
