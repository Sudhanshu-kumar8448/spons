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

// ── User lifecycle payloads ──────────────────────────────────────────

export interface UserRegisteredEmailPayload {
  userId: string;
  email: string;
  timestamp: string;
}

export interface VerifyEmailPayload {
  userId: string;
  email: string;
  verificationToken: string;
  timestamp: string;
}

export interface ResetPasswordEmailPayload {
  userId: string;
  email: string;
  resetToken: string;
  timestamp: string;
}

// ── Interest expressed payloads ──────────────────────────────────────

export interface InterestExpressedEmailPayload {
  sponsorshipId: string;
  companyId: string;
  eventId: string;
  actorId: string;
  timestamp: string;
}

// ── Deal finalized payloads ──────────────────────────────────────────

export interface DealFinalizedEmailPayload {
  proposalId: string;
  sponsorshipId: string;
  actorId: string;
  actorRole: string;
  proposedAmount?: number;
  tierType?: string;
  timestamp: string;
}

// ── Proposal email payloads ──────────────────────────────────────────

export interface ProposalEmailPayload {
  proposalId: string;
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
  reviewerId: string;
  reviewerRole: string;
  decision: 'VERIFIED' | 'REJECTED';
  reviewerNotes: string | null;
  timestamp: string;
}

// ── Notification payloads (in-app) ───────────────────────────────────

export interface ProposalNotificationPayload {
  proposalId: string;
  actorId: string;
  newStatus: string;
  previousStatus?: string;
  timestamp: string;
}

export interface VerificationNotificationPayload {
  entityType: 'Company' | 'Event';
  entityId: string;
  decision: 'VERIFIED' | 'REJECTED';
  timestamp: string;
}

// ── Deliverables payloads ────────────────────────────────────────────

export interface DeliverablesFormSentEmailPayload {
  formId: string;
  tierId: string;
  eventId: string;
  eventName: string;
  tierType: string;
  organizerEmail: string;
  organizerUserId: string;
  timestamp: string;
}

export interface DeliverablesBatchSentEmailPayload {
  eventId: string;
  eventName: string;
  organizerEmail: string;
  organizerUserId: string;
  tiers: Array<{ formId: string; tierId: string; tierType: string }>;
  timestamp: string;
}
