import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_EMAIL,
  JOB_EMAIL_PROPOSAL_SUBMITTED,
  JOB_EMAIL_PROPOSAL_APPROVED,
  JOB_EMAIL_PROPOSAL_REJECTED,
  JOB_EMAIL_COMPANY_VERIFIED,
  JOB_EMAIL_COMPANY_REJECTED,
  JOB_EMAIL_EVENT_VERIFIED,
  JOB_EMAIL_EVENT_REJECTED,
} from '../constants';
import type { ProposalEmailPayload, VerificationEmailPayload } from '../constants';
import { EmailService } from '../services/email.service';
import { PrismaService } from '../../common/providers';

/**
 * Processes jobs from the `email` queue.
 *
 * Resolves real recipient emails via Prisma before sending.
 * Deduplicates recipients with Set().
 * Passes tracking metadata (jobName, entityType, entityId) to EmailService.
 *
 * Idempotency: deterministic jobIds prevent duplicate processing.
 * Retry behaviour is configured at the producer level (3 attempts, exp backoff).
 */
@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job [${job.name}] id=${job.id}`);

    switch (job.name) {
      case JOB_EMAIL_PROPOSAL_SUBMITTED:
        await this.handleProposalSubmitted(job.name, job.data as ProposalEmailPayload);
        break;
      case JOB_EMAIL_PROPOSAL_APPROVED:
        await this.handleProposalApproved(job.name, job.data as ProposalEmailPayload);
        break;
      case JOB_EMAIL_PROPOSAL_REJECTED:
        await this.handleProposalRejected(job.name, job.data as ProposalEmailPayload);
        break;
      case JOB_EMAIL_COMPANY_VERIFIED:
        await this.handleCompanyVerification(
          job.name,
          job.data as VerificationEmailPayload,
          'verified',
        );
        break;
      case JOB_EMAIL_COMPANY_REJECTED:
        await this.handleCompanyVerification(
          job.name,
          job.data as VerificationEmailPayload,
          'rejected',
        );
        break;
      case JOB_EMAIL_EVENT_VERIFIED:
        await this.handleEventVerification(
          job.name,
          job.data as VerificationEmailPayload,
          'verified',
        );
        break;
      case JOB_EMAIL_EVENT_REJECTED:
        await this.handleEventVerification(
          job.name,
          job.data as VerificationEmailPayload,
          'rejected',
        );
        break;
      default:
        this.logger.warn(`Unknown email job name: ${job.name}`);
    }
  }

  // ── Proposal handlers ────────────────────────────────────────────

  /**
   * Proposal submitted → notify the organizer of the event.
   */
  private async handleProposalSubmitted(
    jobName: string,
    data: ProposalEmailPayload,
  ): Promise<void> {
    const recipients = await this.resolveOrganizerEmailsForProposal(data.proposalId);

    if (recipients.length === 0) {
      this.logger.warn(`No organizer email found for proposal ${data.proposalId} — skipping`);
      return;
    }

    for (const to of recipients) {
      await this.emailService.send({
        to,
        subject: `New Proposal Submitted — #${data.proposalId.slice(0, 8)}`,
        html: [
          `<h2>New Sponsorship Proposal</h2>`,
          `<p>A new proposal has been submitted for one of your events.</p>`,
          `<table style="border-collapse:collapse;">`,
          `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Proposal</td><td>${data.proposalId}</td></tr>`,
          data.sponsorshipId
            ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Sponsorship</td><td>${data.sponsorshipId}</td></tr>`
            : '',
          data.proposedAmount
            ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Amount</td><td>${data.proposedAmount}</td></tr>`
            : '',
          `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Status</td><td>${data.newStatus}</td></tr>`,
          `</table>`,
          `<p style="margin-top:16px;color:#666;">Log in to your dashboard to review this proposal.</p>`,
        ].join('\n'),
        text: `New proposal submitted (${data.proposalId}). Amount: ${data.proposedAmount ?? 'N/A'}. Status: ${data.newStatus}.`,
        jobName,
        entityType: 'Proposal',
        entityId: data.proposalId,
      });
    }
  }

  /**
   * Proposal approved → notify the sponsor who created the proposal.
   */
  private async handleProposalApproved(jobName: string, data: ProposalEmailPayload): Promise<void> {
    const recipients = await this.resolveSponsorEmailsForProposal(data.proposalId);

    if (recipients.length === 0) {
      this.logger.warn(`No sponsor email found for proposal ${data.proposalId} — skipping`);
      return;
    }

    for (const to of recipients) {
      await this.emailService.send({
        to,
        subject: `Proposal Approved — #${data.proposalId.slice(0, 8)}`,
        html: [
          `<h2>Your Proposal Has Been Approved! 🎉</h2>`,
          `<p>Great news — your sponsorship proposal has been approved.</p>`,
          `<table style="border-collapse:collapse;">`,
          `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Proposal</td><td>${data.proposalId}</td></tr>`,
          `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Previous Status</td><td>${data.previousStatus ?? 'N/A'}</td></tr>`,
          `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">New Status</td><td>${data.newStatus}</td></tr>`,
          `</table>`,
          `<p style="margin-top:16px;color:#666;">Log in to your dashboard to view the details.</p>`,
        ].join('\n'),
        text: `Your proposal (${data.proposalId}) has been approved. Status: ${data.newStatus}.`,
        jobName,
        entityType: 'Proposal',
        entityId: data.proposalId,
      });
    }
  }

  /**
   * Proposal rejected → notify the sponsor who created the proposal.
   */
  private async handleProposalRejected(jobName: string, data: ProposalEmailPayload): Promise<void> {
    const recipients = await this.resolveSponsorEmailsForProposal(data.proposalId);

    if (recipients.length === 0) {
      this.logger.warn(`No sponsor email found for proposal ${data.proposalId} — skipping`);
      return;
    }

    for (const to of recipients) {
      await this.emailService.send({
        to,
        subject: `Proposal Rejected — #${data.proposalId.slice(0, 8)}`,
        html: [
          `<h2>Proposal Update</h2>`,
          `<p>Unfortunately, your sponsorship proposal has been rejected.</p>`,
          `<table style="border-collapse:collapse;">`,
          `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Proposal</td><td>${data.proposalId}</td></tr>`,
          `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Previous Status</td><td>${data.previousStatus ?? 'N/A'}</td></tr>`,
          `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">New Status</td><td>${data.newStatus}</td></tr>`,
          `</table>`,
          `<p style="margin-top:16px;color:#666;">Log in to your dashboard for more details or to submit a revised proposal.</p>`,
        ].join('\n'),
        text: `Your proposal (${data.proposalId}) has been rejected. Status: ${data.newStatus}.`,
        jobName,
        entityType: 'Proposal',
        entityId: data.proposalId,
      });
    }
  }

  // ── Verification handlers ────────────────────────────────────────

  /**
   * Company verified/rejected → notify all users linked to that company.
   */
  private async handleCompanyVerification(
    jobName: string,
    data: VerificationEmailPayload,
    outcome: 'verified' | 'rejected',
  ): Promise<void> {
    const recipients = await this.resolveCompanyUserEmails(data.entityId);

    if (recipients.length === 0) {
      this.logger.warn(`No user emails found for company ${data.entityId} — skipping`);
      return;
    }

    const isApproved = outcome === 'verified';
    const emoji = isApproved ? '✅' : '❌';

    for (const to of recipients) {
      await this.emailService.send({
        to,
        subject: `Company ${isApproved ? 'Verified' : 'Rejected'} ${emoji}`,
        html: [
          `<h2>Company ${isApproved ? 'Verified' : 'Rejected'}</h2>`,
          `<p>Your company has been <strong>${outcome}</strong> by a reviewer.</p>`,
          data.reviewerNotes ? `<p><strong>Reviewer notes:</strong> ${data.reviewerNotes}</p>` : '',
          `<p style="margin-top:16px;color:#666;">Log in to your dashboard to see full details.</p>`,
        ].join('\n'),
        text: `Your company (${data.entityId}) has been ${outcome}.${data.reviewerNotes ? ` Notes: ${data.reviewerNotes}` : ''}`,
        jobName,
        entityType: 'Company',
        entityId: data.entityId,
      });
    }
  }

  /**
   * Event verified/rejected → notify the organizer who owns the event.
   */
  private async handleEventVerification(
    jobName: string,
    data: VerificationEmailPayload,
    outcome: 'verified' | 'rejected',
  ): Promise<void> {
    const recipients = await this.resolveOrganizerEmailsForEvent(data.entityId);

    if (recipients.length === 0) {
      this.logger.warn(`No organizer email found for event ${data.entityId} — skipping`);
      return;
    }

    const isApproved = outcome === 'verified';
    const emoji = isApproved ? '✅' : '❌';

    for (const to of recipients) {
      await this.emailService.send({
        to,
        subject: `Event ${isApproved ? 'Verified' : 'Rejected'} ${emoji}`,
        html: [
          `<h2>Event ${isApproved ? 'Verified' : 'Rejected'}</h2>`,
          `<p>Your event has been <strong>${outcome}</strong> by a reviewer.</p>`,
          data.reviewerNotes ? `<p><strong>Reviewer notes:</strong> ${data.reviewerNotes}</p>` : '',
          `<p style="margin-top:16px;color:#666;">Log in to your dashboard to see full details.</p>`,
        ].join('\n'),
        text: `Your event (${data.entityId}) has been ${outcome}.${data.reviewerNotes ? ` Notes: ${data.reviewerNotes}` : ''}`,
        jobName,
        entityType: 'Event',
        entityId: data.entityId,
      });
    }
  }

  // ── Email resolution helpers ─────────────────────────────────────

  /**
   * Deduplicate an array of emails.
   */
  private dedupe(emails: string[]): string[] {
    return [...new Set(emails)];
  }

  /**
   * Resolve organizer emails for a proposal.
   *
   * Path: Proposal → Sponsorship → Event → Organizer → Users (ORGANIZER role)
   * Falls back to Organizer.contactEmail if no users found.
   */
  private async resolveOrganizerEmailsForProposal(proposalId: string): Promise<string[]> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        sponsorship: {
          select: {
            event: {
              select: {
                organizer: {
                  select: {
                    id: true,
                    users: {
                      where: { role: 'ORGANIZER', isActive: true },
                      select: { email: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const organizer = proposal?.sponsorship?.event?.organizer;
    if (!organizer) return [];

    const emails = organizer.users.map((u: { email: string }) => u.email).filter(Boolean);
    if (emails.length > 0) return this.dedupe(emails);

    return [];
  }

  /**
   * Resolve sponsor (company) user emails for a proposal.
   *
   * Path: Proposal → Sponsorship → Company → Users (SPONSOR role)
   */
  private async resolveSponsorEmailsForProposal(proposalId: string): Promise<string[]> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        sponsorship: {
          select: {
            company: {
              select: {
                users: {
                  where: { role: 'SPONSOR', isActive: true },
                  select: { email: true },
                },
              },
            },
          },
        },
      },
    });

    const emails = proposal?.sponsorship?.company?.users.map((u: { email: string }) => u.email).filter(Boolean) ?? [];

    return this.dedupe(emails);
  }

  /**
   * Resolve all active user emails for a company.
   */
  private async resolveCompanyUserEmails(companyId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { email: true },
    });

    return this.dedupe(users.map((u) => u.email).filter(Boolean));
  }

  /**
   * Resolve organizer emails for an event.
   *
   * Path: Event → Organizer → Users (ORGANIZER role)
   * Falls back to Organizer.contactEmail.
   */
  private async resolveOrganizerEmailsForEvent(eventId: string): Promise<string[]> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizer: {
          select: {
            users: {
              where: { role: 'ORGANIZER', isActive: true },
              select: { email: true },
            },
          },
        },
      },
    });

    const organizer = event?.organizer;
    if (!organizer) return [];

    const emails = organizer.users.map((u: { email: string }) => u.email).filter(Boolean);
    if (emails.length > 0) return this.dedupe(emails);

    return [];
  }
}
