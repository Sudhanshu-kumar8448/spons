/**
 * Job payload interfaces.
 *
 * Each payload carries ALL context needed by the processor so that jobs
 * are self-contained and never rely on in-memory state. If a retry
 * happens minutes later, the payload still has everything.
 *
 * Fields mirror the domain events they originate from — this is
 * intentional so the producer is a trivial mapping, not a transformation.
 */

// ── Proposal email payloads ──────────────────────────────────────────

export interface ProposalEmailPayload {
  proposalId: string;
  tenantId: string;
  actorId: string;
  actorRole: string;
  /** Current status after the transition */
  newStatus: string;
  /** Previous status (only for status-change jobs) */
  previousStatus?: string;
  sponsorshipId?: string;
  proposedAmount?: number;
  timestamp: string;
}

// ── Verification email payloads ──────────────────────────────────────

export interface VerificationEmailPayload {
  entityType: 'Company' | 'Event';
  entityId: string;
  tenantId: string;
  reviewerId: string;
  reviewerRole: string;
  decision: 'VERIFIED' | 'REJECTED';
  reviewerNotes: string | null;
  timestamp: string;
}

// ── Notification payloads (in-app) ───────────────────────────────────

export interface ProposalNotificationPayload {
  proposalId: string;
  tenantId: string;
  actorId: string;
  newStatus: string;
  previousStatus?: string;
  timestamp: string;
}

export interface VerificationNotificationPayload {
  entityType: 'Company' | 'Event';
  entityId: string;
  tenantId: string;
  decision: 'VERIFIED' | 'REJECTED';
  timestamp: string;
}
