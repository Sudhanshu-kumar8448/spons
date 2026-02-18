/**
 * Verification decision type — used across all verification domain events.
 */
export type VerificationDecision = 'VERIFIED' | 'REJECTED';

/**
 * Common shape for all verification domain events.
 * Every verification event carries reviewer + tenant context so that
 * downstream listeners never need to re-query the database.
 */
export interface VerificationEventPayload {
  entityType: 'Company' | 'Event';
  entityId: string;
  tenantId: string;
  reviewerId: string;
  reviewerRole: string;
  decision: VerificationDecision;
  reviewerNotes: string | null;
  timestamp: string;
}
