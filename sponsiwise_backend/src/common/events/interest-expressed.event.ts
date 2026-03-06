/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls.
 */
export const INTEREST_EXPRESSED_EVENT = 'interest.expressed';

/**
 * Domain event emitted when a brand/sponsor creates a sponsorship,
 * signalling interest in an event.
 */
export class InterestExpressedEvent {
  readonly sponsorshipId: string;
  readonly companyId: string;
  readonly eventId: string;
  readonly actorId: string;
  readonly timestamp: string;

  constructor(payload: {
    sponsorshipId: string;
    companyId: string;
    eventId: string;
    actorId: string;
  }) {
    this.sponsorshipId = payload.sponsorshipId;
    this.companyId = payload.companyId;
    this.eventId = payload.eventId;
    this.actorId = payload.actorId;
    this.timestamp = new Date().toISOString();
  }
}
