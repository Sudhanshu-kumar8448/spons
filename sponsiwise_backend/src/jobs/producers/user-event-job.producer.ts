import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  UserRegisteredEvent,
  USER_REGISTERED_EVENT,
  InterestExpressedEvent,
  INTEREST_EXPRESSED_EVENT,
} from '../../common/events';
import {
  QUEUE_EMAIL,
  JOB_EMAIL_USER_REGISTERED,
  JOB_EMAIL_INTEREST_EXPRESSED,
} from '../constants';
import type { UserRegisteredEmailPayload, InterestExpressedEmailPayload } from '../constants';

const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

/**
 * Listens to user lifecycle and sponsorship interest domain events,
 * then enqueues the corresponding email jobs.
 */
@Injectable()
export class UserEventJobProducer {
  private readonly logger = new Logger(UserEventJobProducer.name);

  constructor(
    @InjectQueue(QUEUE_EMAIL)
    private readonly emailQueue: Queue,
  ) {}

  // ── user.registered ──────────────────────────────────────────────

  @OnEvent(USER_REGISTERED_EVENT)
  async onUserRegistered(event: UserRegisteredEvent): Promise<void> {
    const payload: UserRegisteredEmailPayload = {
      userId: event.userId,
      email: event.email,
      timestamp: event.timestamp,
    };

    const jobId = `${JOB_EMAIL_USER_REGISTERED}:${event.userId}`;

    await this.emailQueue.add(JOB_EMAIL_USER_REGISTERED, payload, {
      ...DEFAULT_JOB_OPTS,
      jobId,
    });

    this.logger.log(`Enqueued welcome email job for user=${event.userId}`);
  }

  // ── interest.expressed ───────────────────────────────────────────

  @OnEvent(INTEREST_EXPRESSED_EVENT)
  async onInterestExpressed(event: InterestExpressedEvent): Promise<void> {
    const payload: InterestExpressedEmailPayload = {
      sponsorshipId: event.sponsorshipId,
      companyId: event.companyId,
      eventId: event.eventId,
      actorId: event.actorId,
      timestamp: event.timestamp,
    };

    const jobId = `${JOB_EMAIL_INTEREST_EXPRESSED}:${event.sponsorshipId}`;

    await this.emailQueue.add(JOB_EMAIL_INTEREST_EXPRESSED, payload, {
      ...DEFAULT_JOB_OPTS,
      jobId,
    });

    this.logger.log(`Enqueued interest-expressed email job for sponsorship=${event.sponsorshipId}`);
  }
}
