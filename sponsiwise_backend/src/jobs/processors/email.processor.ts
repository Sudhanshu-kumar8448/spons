import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_EMAIL,
  JOB_EMAIL_USER_REGISTERED,
  JOB_EMAIL_INTEREST_EXPRESSED,
  JOB_EMAIL_DEAL_FINALIZED,
  JOB_EMAIL_PROPOSAL_SUBMITTED,
  JOB_EMAIL_PROPOSAL_APPROVED,
  JOB_EMAIL_PROPOSAL_REJECTED,
  JOB_EMAIL_COMPANY_VERIFIED,
  JOB_EMAIL_COMPANY_REJECTED,
  JOB_EMAIL_EVENT_VERIFIED,
  JOB_EMAIL_EVENT_REJECTED,
  JOB_EMAIL_DELIVERABLES_FORM_SENT,
} from '../constants';
import type {
  UserRegisteredEmailPayload,
  InterestExpressedEmailPayload,
  DealFinalizedEmailPayload,
  ProposalEmailPayload,
  VerificationEmailPayload,
  DeliverablesFormSentEmailPayload,
} from '../constants';
import { EmailService } from '../services/email.service';
import { PrismaService } from '../../common/providers';
import {
  welcomeTemplate,
  interestExpressedTemplate,
  dealFinalizedTemplate,
  eventVerifiedTemplate,
  eventRejectedTemplate,
  companyVerifiedTemplate,
  companyRejectedTemplate,
  proposalSubmittedTemplate,
  proposalApprovedTemplate,
  proposalRejectedTemplate,
  deliverablesFormSentTemplate,
} from '../services/templates';

/**
 * Processes jobs from the `email` queue.
 *
 * Resolves real recipient emails via Prisma before sending.
 * Deduplicates recipients with Set().
 * Passes tracking metadata (jobName, entityType, entityId) to EmailService.
 * Uses branded HTML templates from src/jobs/services/templates/.
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
      // ── New triggers ──────────────────────────────────────────────
      case JOB_EMAIL_USER_REGISTERED:
        await this.handleUserRegistered(job.name, job.data as UserRegisteredEmailPayload);
        break;
      case JOB_EMAIL_INTEREST_EXPRESSED:
        await this.handleInterestExpressed(job.name, job.data as InterestExpressedEmailPayload);
        break;
      case JOB_EMAIL_DEAL_FINALIZED:
        await this.handleDealFinalized(job.name, job.data as DealFinalizedEmailPayload);
        break;

      // ── Proposal triggers ─────────────────────────────────────────
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
      case JOB_EMAIL_DELIVERABLES_FORM_SENT:
        await this.handleDeliverablesFormSent(job.name, job.data as DeliverablesFormSentEmailPayload);
        break;
      default:
        this.logger.warn(`Unknown email job name: ${job.name}`);
    }
  }

  // ── New trigger handlers ─────────────────────────────────────────

  /** User registered → send welcome email. */
  private async handleUserRegistered(jobName: string, data: UserRegisteredEmailPayload): Promise<void> {
    const { subject, html, text } = welcomeTemplate({ userEmail: data.email });
    await this.emailService.send({
      to: data.email,
      subject,
      html,
      text,
      jobName,
      entityType: 'User',
      entityId: data.userId,
    });
  }

  /**
   * Interest expressed in an event:
   *  → notify the organizer, the brand (sponsor users), and all managers.
   */
  private async handleInterestExpressed(jobName: string, data: InterestExpressedEmailPayload): Promise<void> {
    const sponsorship = await this.prisma.sponsorship.findUnique({
      where: { id: data.sponsorshipId },
      select: {
        id: true,
        company: {
          select: {
            id: true,
            name: true,
            users: {
              where: { role: 'SPONSOR', isActive: true },
              select: { email: true },
            },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            organizer: {
              select: {
                users: {
                  where: { role: 'ORGANIZER', isActive: true },
                  select: { email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!sponsorship) {
      this.logger.warn(`Sponsorship ${data.sponsorshipId} not found — skipping interest-expressed emails`);
      return;
    }

    const { companyName, eventTitle, eventId, companyId, sponsorshipId } = {
      companyName: sponsorship.company.name,
      eventTitle: sponsorship.event.title,
      eventId: sponsorship.event.id,
      companyId: sponsorship.company.id,
      sponsorshipId: sponsorship.id,
    };
    const baseTemplateData = { companyName, eventTitle, eventId, companyId, sponsorshipId };

    // Notify organizer
    for (const to of this.dedupe(sponsorship.event.organizer.users.map((u) => u.email).filter(Boolean))) {
      const { subject, html, text } = interestExpressedTemplate({ ...baseTemplateData, recipientType: 'organizer' });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Sponsorship', entityId: data.sponsorshipId });
    }

    // Notify brand (sponsor users)
    for (const to of this.dedupe(sponsorship.company.users.map((u) => u.email).filter(Boolean))) {
      const { subject, html, text } = interestExpressedTemplate({ ...baseTemplateData, recipientType: 'brand' });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Sponsorship', entityId: data.sponsorshipId });
    }

    // Notify managers
    for (const to of await this.resolveManagerEmails()) {
      const { subject, html, text } = interestExpressedTemplate({ ...baseTemplateData, recipientType: 'manager' });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Sponsorship', entityId: data.sponsorshipId });
    }
  }

  /**
   * Deal finalized (proposal APPROVED):
   *  → notify organizer, sponsor, and all admins.
   */
  private async handleDealFinalized(jobName: string, data: DealFinalizedEmailPayload): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: data.proposalId },
      select: {
        id: true,
        proposedAmount: true,
        proposedTier: true,
        sponsorship: {
          select: {
            id: true,
            company: {
              select: {
                name: true,
                users: {
                  where: { role: 'SPONSOR', isActive: true },
                  select: { email: true },
                },
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                organizer: {
                  select: {
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
        tier: { select: { tierType: true } },
      },
    });

    if (!proposal) {
      this.logger.warn(`Proposal ${data.proposalId} not found — skipping deal-finalized emails`);
      return;
    }

    const baseData = {
      companyName: proposal.sponsorship.company.name,
      eventTitle: proposal.sponsorship.event.title,
      eventId: proposal.sponsorship.event.id,
      sponsorshipId: proposal.sponsorship.id,
      proposalId: data.proposalId,
      proposedAmount: proposal.proposedAmount ? Number(proposal.proposedAmount) : undefined,
      tierType: (proposal.tier?.tierType ?? proposal.proposedTier ?? undefined) as string | undefined,
    };

    for (const to of this.dedupe(proposal.sponsorship.event.organizer.users.map((u) => u.email).filter(Boolean))) {
      const { subject, html, text } = dealFinalizedTemplate({ ...baseData, recipientType: 'organizer' });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Proposal', entityId: data.proposalId });
    }

    for (const to of this.dedupe(proposal.sponsorship.company.users.map((u) => u.email).filter(Boolean))) {
      const { subject, html, text } = dealFinalizedTemplate({ ...baseData, recipientType: 'sponsor' });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Proposal', entityId: data.proposalId });
    }

    for (const to of await this.resolveAdminEmails()) {
      const { subject, html, text } = dealFinalizedTemplate({ ...baseData, recipientType: 'admin' });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Proposal', entityId: data.proposalId });
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
    const [recipients, info] = await Promise.all([
      this.resolveOrganizerEmailsForProposal(data.proposalId),
      this.resolveProposalInfo(data.proposalId),
    ]);

    if (recipients.length === 0) {
      this.logger.warn(`No organizer email found for proposal ${data.proposalId} — skipping`);
      return;
    }

    for (const to of recipients) {
      const { subject, html, text } = proposalSubmittedTemplate({
        recipientType: 'organizer',
        eventTitle: info.eventTitle,
        proposalId: data.proposalId,
        companyName: info.companyName,
        proposedAmount: data.proposedAmount,
      });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Proposal', entityId: data.proposalId });
    }
  }

  /**
   * Proposal approved → notify the sponsor who created the proposal.
   */
  private async handleProposalApproved(jobName: string, data: ProposalEmailPayload): Promise<void> {
    const [recipients, info] = await Promise.all([
      this.resolveSponsorEmailsForProposal(data.proposalId),
      this.resolveProposalInfo(data.proposalId),
    ]);

    if (recipients.length === 0) {
      this.logger.warn(`No sponsor email found for proposal ${data.proposalId} — skipping`);
      return;
    }

    for (const to of recipients) {
      const { subject, html, text } = proposalApprovedTemplate({
        companyName: info.companyName,
        eventTitle: info.eventTitle,
        proposalId: data.proposalId,
        proposedAmount: data.proposedAmount,
      });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Proposal', entityId: data.proposalId });
    }
  }

  /**
   * Proposal rejected → notify the sponsor who created the proposal.
   */
  private async handleProposalRejected(jobName: string, data: ProposalEmailPayload): Promise<void> {
    const [recipients, info] = await Promise.all([
      this.resolveSponsorEmailsForProposal(data.proposalId),
      this.resolveProposalInfo(data.proposalId),
    ]);

    if (recipients.length === 0) {
      this.logger.warn(`No sponsor email found for proposal ${data.proposalId} — skipping`);
      return;
    }

    for (const to of recipients) {
      const { subject, html, text } = proposalRejectedTemplate({
        companyName: info.companyName,
        eventTitle: info.eventTitle,
        proposalId: data.proposalId,
        proposedAmount: data.proposedAmount,
      });
      await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Proposal', entityId: data.proposalId });
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
    const company = await this.prisma.company.findUnique({
      where: { id: data.entityId },
      select: {
        name: true,
        users: { where: { isActive: true }, select: { email: true } },
      },
    });

    const recipients = this.dedupe(
      (company?.users ?? []).map((u) => u.email).filter(Boolean),
    );

    if (recipients.length === 0) {
      this.logger.warn(`No user emails found for company ${data.entityId} — skipping`);
      return;
    }

    for (const to of recipients) {
      if (outcome === 'verified') {
        const { subject, html, text } = companyVerifiedTemplate({
          companyName: company!.name,
          companyId: data.entityId,
          reviewerNotes: data.reviewerNotes,
        });
        await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Company', entityId: data.entityId });
      } else {
        const { subject, html, text } = companyRejectedTemplate({
          companyName: company!.name,
          companyId: data.entityId,
          reviewerNotes: data.reviewerNotes,
        });
        await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Company', entityId: data.entityId });
      }
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
    const event = await this.prisma.event.findUnique({
      where: { id: data.entityId },
      select: {
        title: true,
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

    const recipients = this.dedupe(
      (event?.organizer?.users ?? []).map((u) => u.email).filter(Boolean),
    );

    if (recipients.length === 0) {
      this.logger.warn(`No organizer email found for event ${data.entityId} — skipping`);
      return;
    }

    for (const to of recipients) {
      if (outcome === 'verified') {
        const { subject, html, text } = eventVerifiedTemplate({
          eventTitle: event!.title,
          eventId: data.entityId,
          reviewerNotes: data.reviewerNotes,
        });
        await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Event', entityId: data.entityId });
      } else {
        const { subject, html, text } = eventRejectedTemplate({
          eventTitle: event!.title,
          eventId: data.entityId,
          reviewerNotes: data.reviewerNotes,
        });
        await this.emailService.send({ to, subject, html, text, jobName, entityType: 'Event', entityId: data.entityId });
      }
    }
  }

  // ── Email resolution helpers ─────────────────────────────────────

  private dedupe(emails: string[]): string[] {
    return [...new Set(emails)];
  }

  private async resolveProposalInfo(proposalId: string): Promise<{ eventTitle: string; companyName: string }> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        sponsorship: {
          select: {
            company: { select: { name: true } },
            event: { select: { title: true } },
          },
        },
      },
    });
    return {
      eventTitle: proposal?.sponsorship?.event?.title ?? 'Unknown Event',
      companyName: proposal?.sponsorship?.company?.name ?? 'Unknown Company',
    };
  }

  private async resolveManagerEmails(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { email: true },
    });
    return this.dedupe(users.map((u) => u.email).filter(Boolean));
  }

  private async resolveAdminEmails(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { email: true },
    });
    return this.dedupe(users.map((u) => u.email).filter(Boolean));
  }

  /**
   * Resolve organizer emails for a proposal.
   *
   * Path: Proposal → Sponsorship → Event → Organizer → Users (ORGANIZER role)
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

  // ── Deliverables form sent ──────────────────────────────────────

  private async handleDeliverablesFormSent(
    jobName: string,
    data: DeliverablesFormSentEmailPayload,
  ): Promise<void> {
    const { subject, html, text } = deliverablesFormSentTemplate({
      eventName: data.eventName,
      tierType: data.tierType,
      eventId: data.eventId,
    });

    await this.emailService.send({
      to: data.organizerEmail,
      subject,
      html,
      text,
      jobName,
      entityType: 'TierDeliverableForm',
      entityId: data.formId,
    });
  }

}

