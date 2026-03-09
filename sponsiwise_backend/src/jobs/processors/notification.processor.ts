import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationSeverity, Role } from '@prisma/client';
import {
  QUEUE_NOTIFICATIONS,
  JOB_NOTIFY_PROPOSAL_SUBMITTED,
  JOB_NOTIFY_PROPOSAL_RESUBMITTED,
  JOB_NOTIFY_PROPOSAL_FORWARDED,
  JOB_NOTIFY_PROPOSAL_APPROVED,
  JOB_NOTIFY_PROPOSAL_REJECTED,
  JOB_NOTIFY_PROPOSAL_CHANGES_REQUESTED,
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
        case JOB_NOTIFY_PROPOSAL_RESUBMITTED:
        case JOB_NOTIFY_PROPOSAL_FORWARDED:
        case JOB_NOTIFY_PROPOSAL_APPROVED:
        case JOB_NOTIFY_PROPOSAL_REJECTED:
        case JOB_NOTIFY_PROPOSAL_CHANGES_REQUESTED:
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
    const statusMap: Record<string, { title: string; severity: NotificationSeverity; message: string }> = {
      [JOB_NOTIFY_PROPOSAL_SUBMITTED]: {
        title: 'New Proposal Submitted',
        severity: NotificationSeverity.INFO,
        message: 'A sponsorship proposal is awaiting review.',
      },
      [JOB_NOTIFY_PROPOSAL_RESUBMITTED]: {
        title: 'Proposal Resubmitted',
        severity: NotificationSeverity.INFO,
        message: 'A sponsor has revised and resubmitted their proposal for review.',
      },
      [JOB_NOTIFY_PROPOSAL_FORWARDED]: {
        title: 'Proposal Forwarded',
        severity: NotificationSeverity.INFO,
        message: 'A sponsorship proposal has been forwarded to you for review.',
      },
      [JOB_NOTIFY_PROPOSAL_APPROVED]: {
        title: 'Proposal Approved',
        severity: NotificationSeverity.SUCCESS,
        message: 'Your proposal has been approved.',
      },
      [JOB_NOTIFY_PROPOSAL_REJECTED]: {
        title: 'Proposal Rejected',
        severity: NotificationSeverity.WARNING,
        message: 'Your proposal was rejected.',
      },
      [JOB_NOTIFY_PROPOSAL_CHANGES_REQUESTED]: {
        title: 'Changes Requested',
        severity: NotificationSeverity.WARNING,
        message: 'Changes were requested on your proposal. Please revise and resubmit.',
      },
    };

    const config = statusMap[jobName];
    if (!config) return;

    const recipients = await this.resolveProposalRecipients(jobName, data.proposalId);

    if (recipients.length === 0) {
      this.logger.warn(`No recipients found for proposal notification ${jobName} on ${data.proposalId}`);
      return;
    }

    await Promise.all(
      recipients.map((recipient) =>
        this.notificationsService.create({
          userId: recipient.userId,
          title: config.title,
          message: config.message,
          severity: config.severity,
          link: this.resolveProposalLinkByRole(recipient.role, data.proposalId),
          entityType: 'Proposal',
          entityId: data.proposalId,
        }),
      ),
    );

    this.logger.log(
      `Proposal notification persisted: ${jobName} for ${recipients.length} recipient(s)`,
    );
  }

  private async resolveProposalRecipients(
    jobName: string,
    proposalId: string,
  ): Promise<Array<{ userId: string; role: Role }>> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        sponsorship: {
          select: {
            company: {
              select: {
                users: {
                  where: { role: Role.SPONSOR, isActive: true },
                  select: { id: true, role: true },
                },
              },
            },
            event: {
              select: {
                organizer: {
                  select: {
                    users: {
                      where: { role: Role.ORGANIZER, isActive: true },
                      select: { id: true, role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      this.logger.warn(`Proposal ${proposalId} not found while resolving recipients`);
      return [];
    }

    const sponsorUsers = proposal.sponsorship.company.users.map((u) => ({
      userId: u.id,
      role: u.role,
    }));
    const organizerUsers = proposal.sponsorship.event.organizer.users.map((u) => ({
      userId: u.id,
      role: u.role,
    }));

    let recipients: Array<{ userId: string; role: Role }> = [];
    if (
      jobName === JOB_NOTIFY_PROPOSAL_SUBMITTED ||
      jobName === JOB_NOTIFY_PROPOSAL_RESUBMITTED
    ) {
      const managerUsers = await this.resolveManagerUsers();
      recipients = [...organizerUsers, ...managerUsers];
    } else if (jobName === JOB_NOTIFY_PROPOSAL_FORWARDED) {
      // Forwarded proposals → notify organizer only
      recipients = [...organizerUsers];
    } else {
      recipients = sponsorUsers;
    }

    const deduped = new Map<string, { userId: string; role: Role }>();
    for (const recipient of recipients) {
      deduped.set(recipient.userId, recipient);
    }

    return [...deduped.values()];
  }

  private async resolveManagerUsers(): Promise<Array<{ userId: string; role: Role }>> {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN] },
        isActive: true,
      },
      select: { id: true, role: true },
    });

    return users.map((u) => ({ userId: u.id, role: u.role }));
  }

  private resolveProposalLinkByRole(role: Role, proposalId: string): string {
    if (role === Role.SPONSOR) {
      return `/brand/proposals/${proposalId}`;
    }
    if (role === Role.ORGANIZER) {
      return `/organizer/events/proposals/${proposalId}`;
    }
    return `/manager/proposals/${proposalId}`;
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
        where: { companyId: data.entityId },
        select: { id: true },
      });
      recipientUserIds = users.map((u) => u.id);
    } else if (data.entityType === 'Event') {
      const event = await this.prisma.event.findFirst({
        where: { id: data.entityId },
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

    const link =
      data.entityType === 'Company'
        ? '/brand/dashboard'
        : `/organizer/events/${data.entityId}`;

    // Broadcast notification to all recipients
    await Promise.all(
      recipientUserIds.map((userId) =>
        this.notificationsService.create({
          userId,
          title,
          message,
          severity,
          link,
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
