/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls.
 */
export const DEAL_FINALIZED_EVENT = 'deal.finalized';

/**
 * Domain event emitted when a proposal is APPROVED and a sponsorship deal
 * is officially finalized between a brand and an event organizer.
 */
export class DealFinalizedEvent {
  readonly proposalId: string;
  readonly sponsorshipId: string;
  readonly actorId: string;
  readonly actorRole: string;
  readonly proposedAmount?: number;
  readonly tierType?: string;
  readonly timestamp: string;

  constructor(payload: {
    proposalId: string;
    sponsorshipId: string;
    actorId: string;
    actorRole: string;
    proposedAmount?: number;
    tierType?: string;
  }) {
    this.proposalId = payload.proposalId;
    this.sponsorshipId = payload.sponsorshipId;
    this.actorId = payload.actorId;
    this.actorRole = payload.actorRole;
    this.proposedAmount = payload.proposedAmount;
    this.tierType = payload.tierType;
    this.timestamp = new Date().toISOString();
  }
}
