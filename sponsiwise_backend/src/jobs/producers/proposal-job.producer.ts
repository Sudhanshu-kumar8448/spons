import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PROPOSAL_CREATED_EVENT, ProposalCreatedEvent } from '../../proposals/events';
import { PROPOSAL_STATUS_CHANGED_EVENT, ProposalStatusChangedEvent } from '../../proposals/events';
import {
  QUEUE_EMAIL,
  QUEUE_NOTIFICATIONS,
  JOB_EMAIL_PROPOSAL_SUBMITTED,
  JOB_EMAIL_PROPOSAL_APPROVED,
  JOB_EMAIL_PROPOSAL_REJECTED,
  JOB_NOTIFY_PROPOSAL_SUBMITTED,
  JOB_NOTIFY_PROPOSAL_APPROVED,
  JOB_NOTIFY_PROPOSAL_REJECTED,
} from '../constants';
import type { ProposalEmailPayload, ProposalNotificationPayload } from '../constants';

/**
 * Default job options shared by all proposal jobs.
 *
 * - 3 attempts with exponential backoff (1s → 2s → 4s)
 * - `removeOnComplete` keeps the last 100 for debugging
 * - `removeOnFail` keeps the last 200 for post-mortem
 */
const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
};

/**
 * Listens to proposal domain events and enqueues BullMQ jobs.
 *
 * This is a **producer** only — it never processes jobs itself.
 * Each job gets a deterministic ID (`<jobName>:<entityId>`) so that
 * if the same event is emitted twice (e.g. during a retry of the
 * original request), BullMQ silently deduplicates it.
 */
@Injectable()
export class ProposalJobProducer {
  private readonly logger = new Logger(ProposalJobProducer.name);

  constructor(
    @InjectQueue(QUEUE_EMAIL)
    private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATIONS)
    private readonly notificationQueue: Queue,
  ) {}

  // ── proposal.created ─────────────────────────────────────────────

  @OnEvent(PROPOSAL_CREATED_EVENT)
  async onProposalCreated(event: ProposalCreatedEvent): Promise<void> {
    const emailPayload: ProposalEmailPayload = {
      proposalId: event.proposalId,
      tenantId: event.tenantId,
      actorId: event.actorId,
      actorRole: event.actorRole,
      newStatus: event.newStatus,
      sponsorshipId: event.sponsorshipId,
      proposedAmount: event.proposedAmount,
      timestamp: event.timestamp,
    };

    const notifyPayload: ProposalNotificationPayload = {
      proposalId: event.proposalId,
      tenantId: event.tenantId,
      actorId: event.actorId,
      newStatus: event.newStatus,
      timestamp: event.timestamp,
    };

    const jobId = `${JOB_EMAIL_PROPOSAL_SUBMITTED}:${event.proposalId}`;
    const notifyJobId = `${JOB_NOTIFY_PROPOSAL_SUBMITTED}:${event.proposalId}`;

    await Promise.all([
      this.emailQueue.add(JOB_EMAIL_PROPOSAL_SUBMITTED, emailPayload, {
        ...DEFAULT_JOB_OPTS,
        jobId,
      }),
      this.notificationQueue.add(JOB_NOTIFY_PROPOSAL_SUBMITTED, notifyPayload, {
        ...DEFAULT_JOB_OPTS,
        jobId: notifyJobId,
      }),
    ]);

    this.logger.log(`Enqueued proposal-created jobs for proposal=${event.proposalId}`);
  }

  // ── proposal.status_changed ──────────────────────────────────────

  @OnEvent(PROPOSAL_STATUS_CHANGED_EVENT)
  async onProposalStatusChanged(event: ProposalStatusChangedEvent): Promise<void> {
    const { jobName, notifyJobName } = this.resolveStatusChangeJobNames(event.newStatus);

    if (!jobName) {
      // Status transitions like DRAFT → SUBMITTED are already covered
      // by proposal.created; others we simply skip.
      return;
    }

    const emailPayload: ProposalEmailPayload = {
      proposalId: event.proposalId,
      tenantId: event.tenantId,
      actorId: event.actorId,
      actorRole: event.actorRole,
      newStatus: event.newStatus,
      previousStatus: event.previousStatus,
      timestamp: event.timestamp,
    };

    const notifyPayload: ProposalNotificationPayload = {
      proposalId: event.proposalId,
      tenantId: event.tenantId,
      actorId: event.actorId,
      newStatus: event.newStatus,
      previousStatus: event.previousStatus,
      timestamp: event.timestamp,
    };

    // Deterministic job ID — safe to retry the same event
    const jobId = `${jobName}:${event.proposalId}:${event.timestamp}`;
    const notifyJobId = `${notifyJobName}:${event.proposalId}:${event.timestamp}`;

    await Promise.all([
      this.emailQueue.add(jobName, emailPayload, {
        ...DEFAULT_JOB_OPTS,
        jobId,
      }),
      this.notificationQueue.add(notifyJobName!, notifyPayload, {
        ...DEFAULT_JOB_OPTS,
        jobId: notifyJobId,
      }),
    ]);

    this.logger.log(`Enqueued status-change jobs [${jobName}] for proposal=${event.proposalId}`);
  }

  // ── helpers ──────────────────────────────────────────────────────

  private resolveStatusChangeJobNames(newStatus: string): {
    jobName: string | null;
    notifyJobName: string | null;
  } {
    switch (newStatus) {
      case 'APPROVED':
        return {
          jobName: JOB_EMAIL_PROPOSAL_APPROVED,
          notifyJobName: JOB_NOTIFY_PROPOSAL_APPROVED,
        };
      case 'REJECTED':
        return {
          jobName: JOB_EMAIL_PROPOSAL_REJECTED,
          notifyJobName: JOB_NOTIFY_PROPOSAL_REJECTED,
        };
      default:
        return { jobName: null, notifyJobName: null };
    }
  }
}
