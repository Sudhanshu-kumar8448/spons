import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationSeverity } from '@prisma/client';
import {
  QUEUE_NOTIFICATIONS,
  JOB_NOTIFY_PROPOSAL_SUBMITTED,
  JOB_NOTIFY_PROPOSAL_APPROVED,
  JOB_NOTIFY_PROPOSAL_REJECTED,
  JOB_NOTIFY_COMPANY_VERIFIED,
  JOB_NOTIFY_COMPANY_REJECTED,
  JOB_NOTIFY_EVENT_VERIFIED,
  JOB_NOTIFY_EVENT_REJECTED,
} from '../constants';
import type { ProposalNotificationPayload, VerificationNotificationPayload } from '../constants';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../common/providers/prisma.service';

/**
 * Processes jobs from the `notifications` queue.
 *
 * Creates persistent Notification records for relevant users.
 *
 * Idempotency: deterministic jobIds prevent duplicate processing.
 * Stateless: all context is in the job payload.
 */
@Processor(QUEUE_NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing notification job [${job.name}] id=${job.id}`);

    try {
      switch (job.name) {
        // ── Proposal notifications ─────────────────────────────────
        case JOB_NOTIFY_PROPOSAL_SUBMITTED:
        case JOB_NOTIFY_PROPOSAL_APPROVED:
        case JOB_NOTIFY_PROPOSAL_REJECTED:
          await this.handleProposalNotification(job.name, job.data as ProposalNotificationPayload);
          break;

        // ── Verification notifications ─────────────────────────────
        case JOB_NOTIFY_COMPANY_VERIFIED:
        case JOB_NOTIFY_COMPANY_REJECTED:
        case JOB_NOTIFY_EVENT_VERIFIED:
        case JOB_NOTIFY_EVENT_REJECTED:
          await this.handleVerificationNotification(
            job.name,
            job.data as VerificationNotificationPayload,
          );
          break;

        default:
          this.logger.warn(`Unknown notification job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process notification job [${job.name}] id=${job.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // Let BullMQ retry
    }
  }

  // ── Proposal handlers ──────────────────────────────────────────

  private async handleProposalNotification(
    jobName: string,
    data: ProposalNotificationPayload,
  ): Promise<void> {
    const statusMap: Record<string, { title: string; severity: NotificationSeverity }> = {
      [JOB_NOTIFY_PROPOSAL_SUBMITTED]: {
        title: 'New Proposal Submitted',
        severity: NotificationSeverity.INFO,
      },
      [JOB_NOTIFY_PROPOSAL_APPROVED]: {
        title: 'Proposal Approved',
        severity: NotificationSeverity.SUCCESS,
      },
      [JOB_NOTIFY_PROPOSAL_REJECTED]: {
        title: 'Proposal Rejected',
        severity: NotificationSeverity.WARNING,
      },
    };

    const config = statusMap[jobName];
    if (!config) return;

    // Notify the actor (the user who owns the proposal context)
    await this.notificationsService.create({
      tenantId: data.tenantId,
      userId: data.actorId,
      title: config.title,
      message: `Proposal ${data.proposalId} status changed to ${data.newStatus}.`,
      severity: config.severity,
      link: `/dashboard/proposals/${data.proposalId}`,
      entityType: 'Proposal',
      entityId: data.proposalId,
    });

    this.logger.log(`Proposal notification persisted: ${jobName} for user ${data.actorId}`);
  }

  // ── Verification handlers ──────────────────────────────────────

  private async handleVerificationNotification(
    jobName: string,
    data: VerificationNotificationPayload,
  ): Promise<void> {
    const isVerified = data.decision === 'VERIFIED';
    const entityLabel = data.entityType.toLowerCase();

    const title = isVerified ? `${data.entityType} Verified` : `${data.entityType} Rejected`;

    const message = isVerified
      ? `Your ${entityLabel} has been verified and is now active.`
      : `Your ${entityLabel} has been rejected. Please review and resubmit.`;

    const severity = isVerified ? NotificationSeverity.SUCCESS : NotificationSeverity.ERROR;

    // Find all owners/admins of the entity to notify them
    let recipientUserIds: string[] = [];

    if (data.entityType === 'Company') {
      const users = await this.prisma.user.findMany({
        where: { companyId: data.entityId, tenantId: data.tenantId },
        select: { id: true },
      });
      recipientUserIds = users.map((u) => u.id);
    } else if (data.entityType === 'Event') {
      const event = await this.prisma.event.findFirst({
        where: { id: data.entityId, tenantId: data.tenantId },
        select: {
          organizer: {
            select: {
              users: {
                select: { id: true },
              },
            },
          },
        },
      });
      if (event?.organizer?.users) {
        recipientUserIds = event.organizer.users.map((u) => u.id);
      }
    }

    if (recipientUserIds.length === 0) {
      this.logger.warn(
        `No recipients found for ${data.entityType} ${data.entityId} — skipping notification`,
      );
      return;
    }

    const linkPrefix = data.entityType === 'Company' ? 'companies' : 'events';

    // Broadcast notification to all recipients
    await Promise.all(
      recipientUserIds.map((userId) =>
        this.notificationsService.create({
          tenantId: data.tenantId,
          userId,
          title,
          message,
          severity,
          link: `/dashboard/${linkPrefix}/${data.entityId}`,
          entityType: data.entityType,
          entityId: data.entityId,
        }),
      ),
    );

    this.logger.log(
      `Verification notification persisted for ${recipientUserIds.length} users (Entity: ${data.entityType} ${data.entityId})`,
    );
  }
}
