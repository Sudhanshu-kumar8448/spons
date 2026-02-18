import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/providers/prisma.service';

// ─── Response types ────────────────────────────────────────────────────

/**
 * Timeline entry types for company lifecycle view.
 *
 * TEST CASE EXAMPLES:
 * 1. Company never sent proposal → only COMPANY_CREATED + COMPANY_VERIFIED/REJECTED
 * 2. Company rejected → COMPANY_CREATED → COMPANY_REJECTED (red)
 * 3. Email failures → EMAIL_FAILED entries with red indicator
 * 4. Full lifecycle → COMPANY_CREATED → VERIFIED → SPONSORSHIP_CREATED → PROPOSAL_SUBMITTED → APPROVED → EMAIL_SENT
 */
export type CompanyLifecycleTimelineType =
  | 'COMPANY_CREATED'
  | 'COMPANY_VERIFIED'
  | 'COMPANY_REJECTED'
  | 'SPONSORSHIP_CREATED'
  | 'PROPOSAL_SUBMITTED'
  | 'PROPOSAL_APPROVED'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_STATUS_CHANGED'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'NOTIFICATION_CREATED'
  | 'AUDIT_LOG';

export interface CompanyLifecycleTimelineEntry {
  type: CompanyLifecycleTimelineType;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorRole?: string;
  status?: string;
  recipient?: string;
  subject?: string;
  description?: string;
  timestamp: Date;
}

export interface CompanyLifecycleStats {
  totalProposals: number;
  approvedProposals: number;
  rejectedProposals: number;
  totalSponsorships: number;
  totalEmails: number;
  failedEmails: number;
}

export interface CompanyLifecycleProgress {
  totalSteps: number;
  completedSteps: number;
  percentage: number;
}

export interface CompanyLifecycleViewResponse {
  company: {
    id: string;
    name: string;
    slug: string | null;
    type: string;
    description: string | null;
    website: string | null;
    logoUrl: string | null;
    verificationStatus: string;
    createdAt: Date;
    updatedAt: Date;
    owner: { id: string; email: string };
  };
  stats: CompanyLifecycleStats;
  progress: CompanyLifecycleProgress;
  timeline: CompanyLifecycleTimelineEntry[];
}

// ─── Service ───────────────────────────────────────────────────────────

@Injectable()
export class CompanyLifecycleService {
  private readonly logger = new Logger(CompanyLifecycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /manager/companies/:id/lifecycle
   *
   * Aggregates company + sponsorships + proposals + audit logs + email logs
   * + notifications into a full lifecycle view.
   *
   * Tenant-scoped: only returns data belonging to the given tenantId.
   */
  async getCompanyLifecycle(
    tenantId: string,
    companyId: string,
  ): Promise<CompanyLifecycleViewResponse> {
    // ── 1. Fetch company ──────────────────────────────────────────────
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        website: true,
        logoUrl: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: { id: true, email: true },
          take: 1,
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const owner = company.users[0] || { id: '', email: '' };

    // ── 2. Fetch sponsorships for this company ────────────────────────
    const sponsorships = await this.prisma.sponsorship.findMany({
      where: { companyId, tenantId },
      select: {
        id: true,
        status: true,
        tier: true,
        createdAt: true,
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const sponsorshipIds = sponsorships.map((s) => s.id);

    // ── 3. Fetch proposals under these sponsorships ───────────────────
    const proposals = sponsorshipIds.length
      ? await this.prisma.proposal.findMany({
          where: { sponsorshipId: { in: sponsorshipIds }, tenantId },
          select: {
            id: true,
            status: true,
            proposedTier: true,
            proposedAmount: true,
            submittedAt: true,
            reviewedAt: true,
            createdAt: true,
            sponsorship: {
              select: {
                event: { select: { title: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // ── 4. Fetch audit logs for Company + related Proposals ───────────
    const entityFilters: { entityType: string; entityId: string }[] = [
      { entityType: 'Company', entityId: companyId },
    ];
    for (const p of proposals) {
      entityFilters.push({ entityType: 'Proposal', entityId: p.id });
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        OR: entityFilters,
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── 5. Fetch email logs for Company + Proposals ───────────────────
    const proposalIds = proposals.map((p) => p.id);
    const emailEntityIds = [companyId, ...proposalIds];

    const emailLogs = await this.prisma.emailLog.findMany({
      where: {
        tenantId,
        entityId: { in: emailEntityIds },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── 6. Fetch notifications for this company ──────────────────────
    const notifications = await this.prisma.notification.findMany({
      where: {
        tenantId,
        entityType: 'Company',
        entityId: companyId,
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── 7. Compute stats ─────────────────────────────────────────────
    const approvedProposals = proposals.filter((p) => p.status === 'APPROVED').length;
    const rejectedProposals = proposals.filter((p) => p.status === 'REJECTED').length;
    const sentEmails = emailLogs.filter((e) => e.status === 'SENT').length;
    const failedEmails = emailLogs.filter((e) => e.status === 'FAILED').length;

    const stats: CompanyLifecycleStats = {
      totalProposals: proposals.length,
      approvedProposals,
      rejectedProposals,
      totalSponsorships: sponsorships.length,
      totalEmails: sentEmails,
      failedEmails,
    };

    // ── 8. Build timeline ────────────────────────────────────────────
    const timeline: CompanyLifecycleTimelineEntry[] = [];

    // Company created
    timeline.push({
      type: 'COMPANY_CREATED',
      entityType: 'Company',
      entityId: company.id,
      description: `Company "${company.name}" was created`,
      timestamp: company.createdAt,
    });

    // Company verification from audit logs
    for (const log of auditLogs) {
      const tType = this.mapAuditAction(log.action);
      if (tType) {
        timeline.push({
          type: tType,
          entityType: log.entityType,
          entityId: log.entityId,
          actorId: log.actorId,
          actorRole: log.actorRole,
          status: this.extractStatus(log.metadata),
          description: this.describeAction(log.action, log.entityType),
          timestamp: log.createdAt,
        });
      }
    }

    // Sponsorship created
    for (const s of sponsorships) {
      timeline.push({
        type: 'SPONSORSHIP_CREATED',
        entityType: 'Sponsorship',
        entityId: s.id,
        status: s.status,
        description: `Sponsorship created for event "${s.event.title}"${s.tier ? ` (${s.tier})` : ''}`,
        timestamp: s.createdAt,
      });
    }

    // Proposals
    for (const p of proposals) {
      const eventTitle = p.sponsorship?.event?.title ?? 'Unknown event';

      // Submission
      if (p.submittedAt) {
        timeline.push({
          type: 'PROPOSAL_SUBMITTED',
          entityType: 'Proposal',
          entityId: p.id,
          status: 'SUBMITTED',
          description: `Proposal submitted for "${eventTitle}"${p.proposedTier ? ` — tier: ${p.proposedTier}` : ''}`,
          timestamp: p.submittedAt,
        });
      }

      // Approval / Rejection
      if (p.reviewedAt && (p.status === 'APPROVED' || p.status === 'REJECTED')) {
        timeline.push({
          type: p.status === 'APPROVED' ? 'PROPOSAL_APPROVED' : 'PROPOSAL_REJECTED',
          entityType: 'Proposal',
          entityId: p.id,
          status: p.status,
          description: `Proposal ${p.status.toLowerCase()} for "${eventTitle}"`,
          timestamp: p.reviewedAt,
        });
      }
    }

    // Emails
    for (const email of emailLogs) {
      timeline.push({
        type: email.status === 'SENT' ? 'EMAIL_SENT' : 'EMAIL_FAILED',
        entityType: email.entityType ?? 'Email',
        entityId: email.entityId ?? email.id,
        status: email.status,
        recipient: email.recipient,
        subject: email.subject,
        description:
          email.status === 'SENT'
            ? `Email "${email.subject}" sent to ${email.recipient}`
            : `Email "${email.subject}" to ${email.recipient} failed: ${email.errorMessage ?? 'Unknown error'}`,
        timestamp: email.createdAt,
      });
    }

    // Notifications
    for (const n of notifications) {
      timeline.push({
        type: 'NOTIFICATION_CREATED',
        entityType: 'Notification',
        entityId: n.id,
        description: `${n.title}: ${n.message}`,
        timestamp: n.createdAt,
      });
    }

    // ── 9. Deduplicate & sort ascending ──────────────────────────────
    const deduped = this.deduplicateTimeline(timeline);
    deduped.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // ── 10. Compute progress ────────────────────────────────────────
    const progress = this.computeProgress(company, sponsorships, proposals, emailLogs);

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        type: company.type,
        description: company.description,
        website: company.website,
        logoUrl: company.logoUrl,
        verificationStatus: company.verificationStatus,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        owner,
      },
      stats,
      progress,
      timeline: deduped,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private mapAuditAction(action: string): CompanyLifecycleTimelineType | null {
    const map: Record<string, CompanyLifecycleTimelineType> = {
      'company.verified': 'COMPANY_VERIFIED',
      'company.rejected': 'COMPANY_REJECTED',
      'proposal.created': 'PROPOSAL_SUBMITTED',
      'proposal.status_changed': 'PROPOSAL_STATUS_CHANGED',
    };
    return map[action] ?? null;
  }

  private extractStatus(metadata: unknown): string | undefined {
    if (metadata && typeof metadata === 'object' && metadata !== null) {
      const m = metadata as Record<string, unknown>;
      if (typeof m.newStatus === 'string') return m.newStatus;
      if (typeof m.status === 'string') return m.status;
    }
    return undefined;
  }

  private describeAction(action: string, entityType: string): string {
    const descriptions: Record<string, string> = {
      'company.verified': 'Company was verified by a manager',
      'company.rejected': 'Company was rejected by a manager',
      'proposal.created': 'A new proposal was created',
      'proposal.status_changed': 'Proposal status was updated',
    };
    return descriptions[action] ?? `${entityType} — ${action}`;
  }

  private deduplicateTimeline(
    entries: CompanyLifecycleTimelineEntry[],
  ): CompanyLifecycleTimelineEntry[] {
    const seen = new Set<string>();
    return entries.filter((entry) => {
      const ts = Math.floor(entry.timestamp.getTime() / 1000);
      const key = `${entry.type}:${entry.entityId}:${ts}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Progress logic:
   *  - Company created = +1 (always completed)
   *  - Company verified = +1 (if VERIFIED or REJECTED)
   *  - Each sponsorship created = +1 (completed)
   *  - Each proposal submitted = +1 (completed when submittedAt set)
   *  - Each proposal approved = +1 (completed when APPROVED)
   *  - Each email SENT = +1 (completed)
   *  - Each email FAILED = +1 total steps but NOT completed (shows gap)
   */
  private computeProgress(
    company: { verificationStatus: string },
    sponsorships: { id: string }[],
    proposals: { status: string; submittedAt: Date | null }[],
    emailLogs: { status: string }[],
  ): CompanyLifecycleProgress {
    let totalSteps = 0;
    let completedSteps = 0;

    // Step: Company created (always done)
    totalSteps += 1;
    completedSteps += 1;

    // Step: Company verification
    totalSteps += 1;
    if (company.verificationStatus === 'VERIFIED' || company.verificationStatus === 'REJECTED') {
      completedSteps += 1;
    }

    // Steps: Sponsorships created (each counts as completed)
    totalSteps += sponsorships.length;
    completedSteps += sponsorships.length;

    // Steps: Proposals submitted
    for (const p of proposals) {
      totalSteps += 1;
      if (p.submittedAt) completedSteps += 1;
    }

    // Steps: Proposals approved (only approved count)
    for (const p of proposals) {
      totalSteps += 1;
      if (p.status === 'APPROVED') completedSteps += 1;
    }

    // Steps: Emails
    for (const email of emailLogs) {
      totalSteps += 1;
      if (email.status === 'SENT') completedSteps += 1;
      // FAILED emails count as a step but NOT completed
    }

    const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return { totalSteps, completedSteps, percentage };
  }
}
