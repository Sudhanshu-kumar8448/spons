import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  COMPANY_VERIFIED_EVENT,
  CompanyVerifiedEvent,
  COMPANY_REJECTED_EVENT,
  CompanyRejectedEvent,
  EVENT_VERIFIED_EVENT,
  EventVerifiedEvent,
  EVENT_REJECTED_EVENT,
  EventRejectedEvent,
} from '../../common/events';
import {
  QUEUE_EMAIL,
  QUEUE_NOTIFICATIONS,
  JOB_EMAIL_COMPANY_VERIFIED,
  JOB_EMAIL_COMPANY_REJECTED,
  JOB_EMAIL_EVENT_VERIFIED,
  JOB_EMAIL_EVENT_REJECTED,
  JOB_NOTIFY_COMPANY_VERIFIED,
  JOB_NOTIFY_COMPANY_REJECTED,
  JOB_NOTIFY_EVENT_VERIFIED,
  JOB_NOTIFY_EVENT_REJECTED,
} from '../constants';
import type { VerificationEmailPayload, VerificationNotificationPayload } from '../constants';

/**
 * Default job options for verification jobs.
 */
const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

/**
 * Listens to verification domain events and enqueues BullMQ jobs.
 *
 * Handles Company and Event verification / rejection.
 * Each job gets a deterministic ID (`<jobName>:<entityId>`) for idempotency.
 */
@Injectable()
export class VerificationJobProducer {
  private readonly logger = new Logger(VerificationJobProducer.name);

  constructor(
    @InjectQueue(QUEUE_EMAIL)
    private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationQueue: Queue,
  ) {}

  // ── Company verified ─────────────────────────────────────────────

  @OnEvent(COMPANY_VERIFIED_EVENT)
  async onCompanyVerified(event: CompanyVerifiedEvent): Promise<void> {
    await this.enqueueVerificationJobs(
      event,
      JOB_EMAIL_COMPANY_VERIFIED,
      JOB_NOTIFY_COMPANY_VERIFIED,
    );
  }

  // ── Company rejected ─────────────────────────────────────────────

  @OnEvent(COMPANY_REJECTED_EVENT)
  async onCompanyRejected(event: CompanyRejectedEvent): Promise<void> {
    await this.enqueueVerificationJobs(
      event,
      JOB_EMAIL_COMPANY_REJECTED,
      JOB_NOTIFY_COMPANY_REJECTED,
    );
  }

  // ── Event verified ───────────────────────────────────────────────

  @OnEvent(EVENT_VERIFIED_EVENT)
  async onEventVerified(event: EventVerifiedEvent): Promise<void> {
    await this.enqueueVerificationJobs(event, JOB_EMAIL_EVENT_VERIFIED, JOB_NOTIFY_EVENT_VERIFIED);
  }

  // ── Event rejected ───────────────────────────────────────────────

  @OnEvent(EVENT_REJECTED_EVENT)
  async onEventRejected(event: EventRejectedEvent): Promise<void> {
    await this.enqueueVerificationJobs(event, JOB_EMAIL_EVENT_REJECTED, JOB_NOTIFY_EVENT_REJECTED);
  }

  // ── shared enqueue logic ─────────────────────────────────────────

  private async enqueueVerificationJobs(
    event: {
      entityType: 'Company' | 'Event';
      entityId: string;
      tenantId: string;
      reviewerId: string;
      reviewerRole: string;
      decision: 'VERIFIED' | 'REJECTED';
      reviewerNotes: string | null;
      timestamp: string;
    },
    emailJobName: string,
    notifyJobName: string,
  ): Promise<void> {
    const emailPayload: VerificationEmailPayload = {
      entityType: event.entityType,
      entityId: event.entityId,
      tenantId: event.tenantId,
      reviewerId: event.reviewerId,
      reviewerRole: event.reviewerRole,
      decision: event.decision,
      reviewerNotes: event.reviewerNotes,
      timestamp: event.timestamp,
    };

    const notifyPayload: VerificationNotificationPayload = {
      entityType: event.entityType,
      entityId: event.entityId,
      tenantId: event.tenantId,
      decision: event.decision,
      timestamp: event.timestamp,
    };

    const emailJobId = `${emailJobName}:${event.entityId}`;
    const notifyJobId = `${notifyJobName}:${event.entityId}`;

    await Promise.all([
      this.emailQueue.add(emailJobName, emailPayload, {
        ...DEFAULT_JOB_OPTS,
        jobId: emailJobId,
      }),
      this.notificationQueue.add(notifyJobName, notifyPayload, {
        ...DEFAULT_JOB_OPTS,
        jobId: notifyJobId,
      }),
    ]);

    this.logger.log(
      `Enqueued verification jobs [${emailJobName}] for ${event.entityType}=${event.entityId}`,
    );
  }
}
