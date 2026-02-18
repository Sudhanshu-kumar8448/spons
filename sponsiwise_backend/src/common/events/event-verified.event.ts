import type { VerificationEventPayload } from './verification.types';

export const EVENT_VERIFIED_EVENT = 'event.verified';

/**
 * Domain event emitted after an event is verified by a reviewer.
 *
 * Example payload:
 * ```json
 * {
 *   "event": "event.verified",
 *   "entityType": "Event",
 *   "entityId": "evt_abc123",
 *   "tenantId": "tenant_xyz",
 *   "reviewerId": "user_456",
 *   "reviewerRole": "ADMIN",
 *   "decision": "VERIFIED",
 *   "reviewerNotes": "Schedule and venue confirmed.",
 *   "timestamp": "2026-02-09T14:10:00.000Z"
 * }
 * ```
 */
export class EventVerifiedEvent implements VerificationEventPayload {
  readonly event = EVENT_VERIFIED_EVENT;
  readonly entityType = 'Event' as const;
  readonly decision = 'VERIFIED' as const;

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
