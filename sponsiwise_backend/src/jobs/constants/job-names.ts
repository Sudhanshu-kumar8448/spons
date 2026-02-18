/**
 * Centralized job name constants.
 *
 * Every BullMQ job dispatched by a producer MUST use a constant from this
 * file. Processors reference the same constant in their @Processor handler,
 * so a typo is caught at compile time rather than silently dropping jobs.
 *
 * Naming convention: <domain>.<action> (dot-separated, lowercase)
 */

// ── Proposal email jobs ──────────────────────────────────────────────
export const JOB_EMAIL_PROPOSAL_SUBMITTED = 'email.proposal.submitted';
export const JOB_EMAIL_PROPOSAL_APPROVED = 'email.proposal.approved';
export const JOB_EMAIL_PROPOSAL_REJECTED = 'email.proposal.rejected';

// ── Verification email jobs ──────────────────────────────────────────
export const JOB_EMAIL_COMPANY_VERIFIED = 'email.company.verified';
export const JOB_EMAIL_COMPANY_REJECTED = 'email.company.rejected';
export const JOB_EMAIL_EVENT_VERIFIED = 'email.event.verified';
export const JOB_EMAIL_EVENT_REJECTED = 'email.event.rejected';

// ── Notification jobs (in-app) ───────────────────────────────────────
export const JOB_NOTIFY_PROPOSAL_SUBMITTED = 'notify.proposal.submitted';
export const JOB_NOTIFY_PROPOSAL_APPROVED = 'notify.proposal.approved';
export const JOB_NOTIFY_PROPOSAL_REJECTED = 'notify.proposal.rejected';
export const JOB_NOTIFY_COMPANY_VERIFIED = 'notify.company.verified';
export const JOB_NOTIFY_COMPANY_REJECTED = 'notify.company.rejected';
export const JOB_NOTIFY_EVENT_VERIFIED = 'notify.event.verified';
export const JOB_NOTIFY_EVENT_REJECTED = 'notify.event.rejected';
