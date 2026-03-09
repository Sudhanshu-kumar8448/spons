/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls.
 */
export const DELIVERABLES_BATCH_SENT_EVENT = 'deliverables.batch.sent';

/**
 * Domain event emitted when a manager sends ALL deliverable forms
 * for an event to the organizer in one batch.
 */
export class DeliverablesBatchSentEvent {
  readonly eventId: string;
  readonly eventName: string;
  readonly organizerEmail: string;
  readonly organizerUserId: string;
  /** Array of { formId, tierId, tierType } for each form sent. */
  readonly tiers: Array<{ formId: string; tierId: string; tierType: string }>;
  readonly timestamp: string;

  constructor(payload: {
    eventId: string;
    eventName: string;
    organizerEmail: string;
    organizerUserId: string;
    tiers: Array<{ formId: string; tierId: string; tierType: string }>;
  }) {
    this.eventId = payload.eventId;
    this.eventName = payload.eventName;
    this.organizerEmail = payload.organizerEmail;
    this.organizerUserId = payload.organizerUserId;
    this.tiers = payload.tiers;
    this.timestamp = new Date().toISOString();
  }
}
