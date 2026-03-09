/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls.
 */
export const PASSWORD_RESET_REQUESTED_EVENT = 'password.reset.requested';

/**
 * Domain event emitted when a user requests a password reset.
 */
export class PasswordResetRequestedEvent {
  readonly userId: string;
  readonly email: string;
  readonly resetToken: string; // raw token (not hashed) — for including in email link
  readonly timestamp: string;

  constructor(payload: { userId: string; email: string; resetToken: string }) {
    this.userId = payload.userId;
    this.email = payload.email;
    this.resetToken = payload.resetToken;
    this.timestamp = new Date().toISOString();
  }
}
