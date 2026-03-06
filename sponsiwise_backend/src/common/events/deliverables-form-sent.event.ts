/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls.
 */
export const DELIVERABLES_FORM_SENT_EVENT = 'deliverables.form.sent';

/**
 * Domain event emitted when a manager sends a deliverable form
 * to an organizer for filling.
 */
export class DeliverablesFormSentEvent {
  readonly formId: string;
  readonly tierId: string;
  readonly eventId: string;
  readonly eventName: string;
  readonly tierType: string;
  readonly organizerEmail: string;
  readonly organizerUserId: string;
  readonly timestamp: string;

  constructor(payload: {
    formId: string;
    tierId: string;
    eventId: string;
    eventName: string;
    tierType: string;
    organizerEmail: string;
    organizerUserId: string;
  }) {
    this.formId = payload.formId;
    this.tierId = payload.tierId;
    this.eventId = payload.eventId;
    this.eventName = payload.eventName;
    this.tierType = payload.tierType;
    this.organizerEmail = payload.organizerEmail;
    this.organizerUserId = payload.organizerUserId;
    this.timestamp = new Date().toISOString();
  }
}
