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
  JOB_EMAIL_PROPOSAL_FORWARDED,
  JOB_EMAIL_PROPOSAL_APPROVED,
  JOB_EMAIL_PROPOSAL_REJECTED,
  JOB_EMAIL_PROPOSAL_CHANGES_REQUESTED,
  JOB_EMAIL_DEAL_FINALIZED,
  JOB_NOTIFY_PROPOSAL_SUBMITTED,
  JOB_NOTIFY_PROPOSAL_RESUBMITTED,
  JOB_NOTIFY_PROPOSAL_FORWARDED,
  JOB_NOTIFY_PROPOSAL_APPROVED,
  JOB_NOTIFY_PROPOSAL_REJECTED,
  JOB_NOTIFY_PROPOSAL_CHANGES_REQUESTED,
} from '../constants';
import type { ProposalEmailPayload, ProposalNotificationPayload, DealFinalizedEmailPayload } from '../constants';

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
    const notifyPayload: ProposalNotificationPayload = {
      proposalId: event.proposalId,
      actorId: event.actorId,
      newStatus: event.newStatus,
      timestamp: event.timestamp,
    };

    const notifyJobId = `${JOB_NOTIFY_PROPOSAL_SUBMITTED}--${event.proposalId}`;

    // Only enqueue notification — email is sent when manager forwards to organizer
    await this.notificationQueue.add(JOB_NOTIFY_PROPOSAL_SUBMITTED, notifyPayload, {
      ...DEFAULT_JOB_OPTS,
      jobId: notifyJobId,
    });

    this.logger.log(`Enqueued proposal-created notification for proposal=${event.proposalId}`);
  }

  // ── proposal.status_changed ──────────────────────────────────────

  @OnEvent(PROPOSAL_STATUS_CHANGED_EVENT)
  async onProposalStatusChanged(event: ProposalStatusChangedEvent): Promise<void> {
    const { jobName, notifyJobName } = this.resolveStatusChangeJobNames(event.newStatus, event.previousStatus);

    if (!jobName && !notifyJobName) {
      // Non-actionable transitions are skipped.
      return;
    }

    const emailPayload: ProposalEmailPayload = {
      proposalId: event.proposalId,
      actorId: event.actorId,
      actorRole: event.actorRole,
      newStatus: event.newStatus,
      previousStatus: event.previousStatus,
      timestamp: event.timestamp,
    };

    const notifyPayload: ProposalNotificationPayload = {
      proposalId: event.proposalId,
      actorId: event.actorId,
      newStatus: event.newStatus,
      previousStatus: event.previousStatus,
      timestamp: event.timestamp,
    };

    const jobs: Promise<unknown>[] = [];

    // Enqueue email job if present
    if (jobName) {
      const jobId = `${jobName}--${event.proposalId}--${event.timestamp}`;
      jobs.push(
        this.emailQueue.add(jobName, emailPayload, {
          ...DEFAULT_JOB_OPTS,
          jobId,
        }),
      );
    }

    // Enqueue notification job if present
    if (notifyJobName) {
      const notifyJobId = `${notifyJobName}--${event.proposalId}--${event.timestamp}`;
      jobs.push(
        this.notificationQueue.add(notifyJobName, notifyPayload, {
          ...DEFAULT_JOB_OPTS,
          jobId: notifyJobId,
        }),
      );
    }

    await Promise.all(jobs);

    // When a proposal is APPROVED, additionally enqueue the deal.finalized job
    if (event.newStatus === 'APPROVED') {
      const dealPayload: DealFinalizedEmailPayload = {
        proposalId: event.proposalId,
        sponsorshipId: '',   // resolved from DB in email processor
        actorId: event.actorId,
        actorRole: event.actorRole,
        timestamp: event.timestamp,
      };
      const dealJobId = `${JOB_EMAIL_DEAL_FINALIZED}--${event.proposalId}--${event.timestamp}`;
      await this.emailQueue.add(JOB_EMAIL_DEAL_FINALIZED, dealPayload, {
        ...DEFAULT_JOB_OPTS,
        jobId: dealJobId,
      });
      this.logger.log(`Enqueued deal-finalized job for proposal=${event.proposalId}`);
    }

    this.logger.log(`Enqueued status-change jobs [email=${jobName ?? 'none'}, notify=${notifyJobName ?? 'none'}] for proposal=${event.proposalId}`);
  }

  // ── helpers ──────────────────────────────────────────────────────

  private resolveStatusChangeJobNames(
    newStatus: string,
    previousStatus?: string,
  ): {
    jobName: string | null;
    notifyJobName: string | null;
  } {
    switch (newStatus) {
      case 'SUBMITTED':
        // No email on SUBMITTED — email is sent when manager forwards to organizer
        return {
          jobName: null,
          notifyJobName:
            previousStatus === 'REQUEST_CHANGES'
              ? JOB_NOTIFY_PROPOSAL_RESUBMITTED
              : JOB_NOTIFY_PROPOSAL_SUBMITTED,
        };
      case 'FORWARDED_TO_ORGANIZER':
        return {
          jobName: JOB_EMAIL_PROPOSAL_FORWARDED,
          notifyJobName: JOB_NOTIFY_PROPOSAL_FORWARDED,
        };
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
      case 'REQUEST_CHANGES':
        return {
          jobName: JOB_EMAIL_PROPOSAL_CHANGES_REQUESTED,
          notifyJobName: JOB_NOTIFY_PROPOSAL_CHANGES_REQUESTED,
        };
      default:
        return { jobName: null, notifyJobName: null };
    }
  }
}
