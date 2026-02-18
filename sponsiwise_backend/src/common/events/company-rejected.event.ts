import type { VerificationEventPayload } from './verification.types';

export const COMPANY_REJECTED_EVENT = 'company.rejected';

/**
 * Domain event emitted after a company is rejected by a reviewer.
 *
 * Example payload:
 * ```json
 * {
 *   "event": "company.rejected",
 *   "entityType": "Company",
 *   "entityId": "comp_abc123",
 *   "tenantId": "tenant_xyz",
 *   "reviewerId": "user_456",
 *   "reviewerRole": "ADMIN",
 *   "decision": "REJECTED",
 *   "reviewerNotes": "Missing tax registration documents.",
 *   "timestamp": "2026-02-09T14:05:00.000Z"
 * }
 * ```
 */
export class CompanyRejectedEvent implements VerificationEventPayload {
  readonly event = COMPANY_REJECTED_EVENT;
  readonly entityType = 'Company' as const;
  readonly decision = 'REJECTED' as const;

  readonly entityId: string;
  readonly tenantId: string;
  readonly reviewerId: string;
  readonly reviewerRole: string;
  readonly reviewerNotes: string | null;
  readonly timestamp: string;

  constructor(params: {
    entityId: string;
    tenantId: string;
    reviewerId: string;
    reviewerRole: string;
    reviewerNotes?: string | null;
  }) {
    this.entityId = params.entityId;
    this.tenantId = params.tenantId;
    this.reviewerId = params.reviewerId;
    this.reviewerRole = params.reviewerRole;
    this.reviewerNotes = params.reviewerNotes ?? null;
    this.timestamp = new Date().toISOString();
  }
}
