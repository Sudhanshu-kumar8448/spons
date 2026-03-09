/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls.
 */
export const EMAIL_VERIFICATION_REQUESTED_EVENT = 'email.verification.requested';

/**
 * Domain event emitted when a user registers and needs email verification.
 */
export class EmailVerificationRequestedEvent {
  readonly userId: string;
  readonly email: string;
  readonly verificationToken: string; // raw token (not hashed) — for including in email link
  readonly timestamp: string;

  constructor(payload: { userId: string; email: string; verificationToken: string }) {
    this.userId = payload.userId;
    this.email = payload.email;
    this.verificationToken = payload.verificationToken;
    this.timestamp = new Date().toISOString();
  }
}
