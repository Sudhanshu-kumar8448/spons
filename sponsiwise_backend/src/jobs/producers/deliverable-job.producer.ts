import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DeliverablesFormSentEvent,
  DELIVERABLES_FORM_SENT_EVENT,
} from '../../common/events';
import {
  QUEUE_EMAIL,
  JOB_EMAIL_DELIVERABLES_FORM_SENT,
} from '../constants';
import type { DeliverablesFormSentEmailPayload } from '../constants';

const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

/**
 * Listens to deliverable-related domain events and enqueues email jobs.
 */
@Injectable()
export class DeliverableJobProducer {
  private readonly logger = new Logger(DeliverableJobProducer.name);

  constructor(
    @InjectQueue(QUEUE_EMAIL)
    private readonly emailQueue: Queue,
  ) {}

  @OnEvent(DELIVERABLES_FORM_SENT_EVENT)
  async onDeliverablesFormSent(event: DeliverablesFormSentEvent): Promise<void> {
    const payload: DeliverablesFormSentEmailPayload = {
      formId: event.formId,
      tierId: event.tierId,
      eventId: event.eventId,
      eventName: event.eventName,
      tierType: event.tierType,
      organizerEmail: event.organizerEmail,
      organizerUserId: event.organizerUserId,
      timestamp: event.timestamp,
    };

    const jobId = `${JOB_EMAIL_DELIVERABLES_FORM_SENT}:${event.formId}`;

    await this.emailQueue.add(JOB_EMAIL_DELIVERABLES_FORM_SENT, payload, {
      ...DEFAULT_JOB_OPTS,
      jobId,
    });

    this.logger.log(`Enqueued deliverables-form-sent email for form=${event.formId}`);
  }
}
