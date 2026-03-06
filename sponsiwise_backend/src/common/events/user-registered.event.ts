/**
 * Event name constant — use this in @OnEvent() decorators and emitter calls.
 */
export const USER_REGISTERED_EVENT = 'user.registered';

/**
 * Domain event emitted after a new user successfully registers.
 */
export class UserRegisteredEvent {
  readonly userId: string;
  readonly email: string;
  readonly timestamp: string;

  constructor(payload: { userId: string; email: string }) {
    this.userId = payload.userId;
    this.email = payload.email;
    this.timestamp = new Date().toISOString();
  }
}
