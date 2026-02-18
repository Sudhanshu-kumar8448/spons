import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * ─── Timeline entry types ──────────────────────────────────────────────
 */
export type TimelineType =
  | 'EVENT_CREATED'
  | 'EVENT_VERIFIED'
  | 'EVENT_REJECTED'
  | 'PROPOSAL_SUBMITTED'
  | 'PROPOSAL_APPROVED'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_STATUS_CHANGED'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'AUDIT_LOG';

export interface TimelineEntry {
  type: TimelineType;
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

export interface LifecycleProgress {
  totalSteps: number;
  completedSteps: number;
  percentage: number;
}

export interface EventLifecycleResponse {
  event: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
    verificationStatus: string;
    createdAt: Date;
    organizer: {
      id: string;
      name: string;
      contactEmail: string | null;
      logoUrl: string | null;
    };
  };
  proposals: {
    id: string;
    status: string;
    proposedTier: string | null;
    proposedAmount: number | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    createdAt: Date;
    sponsorship: {
      id: string;
      company: {
        id: string;
        name: string;
      };
    };
  }[];
  progress: LifecycleProgress;
  timeline: TimelineEntry[];
}

/**
 * ManagerLifecycleService — aggregates full event lifecycle data for the manager dashboard.
 *
 * Gathers:
 *  - Event data with organizer
 *  - All proposals under that event (via sponsorships)
 *  - Audit logs for event + proposal actions
 *  - Email logs for entityType Event / Proposal
 *
 * Computes progress and builds a chronological timeline.
 *
 * ──────────────────────────────────────────────────────────────────────
 * TEST SCENARIOS (in comments)
 * ──────────────────────────────────────────────────────────────────────
 *
 * Case 1:
 *   - Event created, no proposals, not verified
 *   - Expected: totalSteps=2 (created + verification), completedSteps=1 (created)
 *   - Progress: 50%, timeline has 1 entry (EVENT_CREATED)
 *
 * Case 2:
 *   - Event verified, 2 proposals submitted, 1 approved, emails sent successfully
 *   - Expected: totalSteps = 2 (event created + verified) + 2*2 (proposals: submitted + decision) + N emails
 *   - completedSteps = 2 + 2 (submitted) + 1 (approved) + N sent emails
 *   - High progress %
 *
 * Case 3:
 *   - Email failed
 *   - Expected: Timeline shows EMAIL_FAILED entry with red indicator
 *   - Progress should NOT count the failed email as completed
 *   - totalSteps includes the failed email, completedSteps does not
 *
 * Case 4:
 *   - Multiple proposals
 *   - Expected: Deduplicated timeline entries (no duplicate audit log + email for same action)
 *   - Timeline sorted chronologically
 */
@Injectable()
export class ManagerLifecycleService {
  private readonly logger = new Logger(ManagerLifecycleService.name);

  constructor(private readonly prisma: PrismaService) { }

  async getEventLifecycle(tenantId: string, eventId: string): Promise<EventLifecycleResponse> {
    // ─── 1. Parallel Fetch: Event & Sponsorships ────────────────────
    const [event, sponsorships] = await Promise.all([
      this.prisma.event.findFirst({
        where: { id: eventId, tenantId },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,
          verificationStatus: true,
          createdAt: true,
          organizer: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              logoUrl: true,
            },
          },
        },
      }),
      this.prisma.sponsorship.findMany({
        where: { eventId, tenantId },
        select: {
          id: true,
          company: {
            select: { id: true, name: true },
          },
          proposals: {
            select: {
              id: true,
              status: true,
              proposedTier: true,
              proposedAmount: true,
              submittedAt: true,
              reviewedAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // ─── 2. Process Proposals ───────────────────────────────────────
    const proposals = sponsorships.flatMap((s) =>
      s.proposals.map((p) => ({
        ...p,
        proposedAmount: p.proposedAmount ? Number(p.proposedAmount) : null,
        sponsorship: {
          id: s.id,
          company: s.company,
        },
      })),
    );

    const proposalIds = proposals.map((p) => p.id);

    // ─── 3. Parallel Fetch: Audit Logs & Email Logs ─────────────────
    const [auditLogs, emailLogs] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          OR: [
            { entityType: 'Event', entityId: eventId },
            ...(proposalIds.length > 0
              ? [{ entityType: 'Proposal', entityId: { in: proposalIds } }]
              : []),
          ],
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.emailLog.findMany({
        where: {
          tenantId,
          OR: [
            { entityType: 'Event', entityId: eventId },
            ...(proposalIds.length > 0
              ? [{ entityType: 'Proposal', entityId: { in: proposalIds } }]
              : []),
          ],
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // ─── 5. Build timeline ──────────────────────────────────────────
    const timeline: TimelineEntry[] = [];

    // Event creation entry
    timeline.push({
      type: 'EVENT_CREATED',
      entityType: 'Event',
      entityId: event.id,
      description: `Event "${event.title}" was created`,
      timestamp: event.createdAt,
    });

    // Audit log entries
    for (const log of auditLogs) {
      const timelineType = this.mapAuditActionToTimelineType(log.action);
      if (timelineType) {
        timeline.push({
          type: timelineType,
          entityType: log.entityType,
          entityId: log.entityId,
          actorId: log.actorId,
          actorRole: log.actorRole,
          status: this.extractStatusFromMetadata(log.metadata),
          description: this.describeAuditAction(log.action, log.entityType, log.entityId),
          timestamp: log.createdAt,
        });
      }
    }

    // Proposal submissions (from proposal data — ensure at least one entry per submitted proposal)
    for (const proposal of proposals) {
      if (proposal.submittedAt) {
        const alreadyHasSubmitted = timeline.some(
          (t) => t.type === 'PROPOSAL_SUBMITTED' && t.entityId === proposal.id,
        );
        if (!alreadyHasSubmitted) {
          timeline.push({
            type: 'PROPOSAL_SUBMITTED',
            entityType: 'Proposal',
            entityId: proposal.id,
            status: 'SUBMITTED',
            description: `Proposal from ${proposal.sponsorship.company.name} was submitted`,
            timestamp: proposal.submittedAt,
          });
        }
      }
    }

    // Email log entries
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

    // Deduplicate by type+entityId+timestamp (within 1s window)
    const deduped = this.deduplicateTimeline(timeline);

    // Sort chronologically
    deduped.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // ─── 6. Compute progress ────────────────────────────────────────
    const progress = this.computeProgress(event, proposals, emailLogs);

    return {
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        verificationStatus: event.verificationStatus,
        createdAt: event.createdAt,
        organizer: event.organizer,
      },
      proposals,
      progress,
      timeline: deduped,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /**
   * Maps audit log action strings to TimelineType.
   */
  private mapAuditActionToTimelineType(action: string): TimelineType | null {
    const map: Record<string, TimelineType> = {
      'event.verified': 'EVENT_VERIFIED',
      'event.rejected': 'EVENT_REJECTED',
      'proposal.created': 'PROPOSAL_SUBMITTED',
      'proposal.submitted': 'PROPOSAL_SUBMITTED',
      'proposal.approved': 'PROPOSAL_APPROVED',
      'proposal.rejected': 'PROPOSAL_REJECTED',
      'proposal.status_changed': 'PROPOSAL_STATUS_CHANGED',
    };
    return map[action] ?? null;
  }

  /**
   * Extracts a status string from audit log metadata JSON.
   */
  private extractStatusFromMetadata(metadata: unknown): string | undefined {
    if (metadata && typeof metadata === 'object' && metadata !== null) {
      const m = metadata as Record<string, unknown>;
      if (typeof m.newStatus === 'string') return m.newStatus;
      if (typeof m.status === 'string') return m.status;
    }
    return undefined;
  }

  /**
   * Human-readable description for an audit action.
   */
  private describeAuditAction(action: string, entityType: string, entityId: string): string {
    const shortId = entityId.slice(0, 8);
    const descriptions: Record<string, string> = {
      'event.verified': `Event ${shortId}… was verified`,
      'event.rejected': `Event ${shortId}… was rejected`,
      'proposal.created': `Proposal ${shortId}… was created`,
      'proposal.submitted': `Proposal ${shortId}… was submitted`,
      'proposal.approved': `Proposal ${shortId}… was approved`,
      'proposal.rejected': `Proposal ${shortId}… was rejected`,
      'proposal.status_changed': `Proposal ${shortId}… status changed`,
    };
    return descriptions[action] ?? `${entityType} ${shortId}… — ${action}`;
  }

  /**
   * Deduplicates timeline entries: same type + entityId within 1-second window.
   */
  private deduplicateTimeline(entries: TimelineEntry[]): TimelineEntry[] {
    const seen = new Set<string>();
    return entries.filter((entry) => {
      // Round timestamp to nearest second for dedup
      const ts = Math.floor(entry.timestamp.getTime() / 1000);
      const key = `${entry.type}:${entry.entityId}:${ts}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Computes progress based on lifecycle steps.
   *
   * Steps counted:
   *  - Event created → always 1 completed step
   *  - Event verification → 1 step (completed if verified/rejected)
   *  - Per proposal: submission → 1 step (completed if submitted)
   *  - Per proposal: decision → 1 step (completed if approved/rejected)
   *  - Per email: 1 step (completed only if SENT, not FAILED)
   */
  private computeProgress(
    event: { verificationStatus: string },
    proposals: { status: string; submittedAt: Date | null }[],
    emailLogs: { status: string }[],
  ): LifecycleProgress {
    let totalSteps = 0;
    let completedSteps = 0;

    // Step 1: Event created (always complete)
    totalSteps += 1;
    completedSteps += 1;

    // Step 2: Event verification
    totalSteps += 1;
    if (event.verificationStatus === 'VERIFIED' || event.verificationStatus === 'REJECTED') {
      completedSteps += 1;
    }

    // Steps for proposals
    for (const proposal of proposals) {
      // Submission step
      totalSteps += 1;
      if (proposal.submittedAt) {
        completedSteps += 1;
      }

      // Decision step (approved/rejected)
      totalSteps += 1;
      if (['APPROVED', 'REJECTED'].includes(proposal.status)) {
        completedSteps += 1;
      }
    }

    // Steps for emails
    for (const email of emailLogs) {
      totalSteps += 1;
      if (email.status === 'SENT') {
        completedSteps += 1;
      }
      // FAILED emails count toward total but NOT completed
    }

    const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return { totalSteps, completedSteps, percentage };
  }
}
