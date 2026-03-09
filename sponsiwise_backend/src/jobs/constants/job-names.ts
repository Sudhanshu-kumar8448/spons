/**
 * Centralized job name constants.
 *
 * Every BullMQ job dispatched by a producer MUST use a constant from this
 * file. Processors reference the same constant in their @Processor handler,
 * so a typo is caught at compile time rather than silently dropping jobs.
 *
 * Naming convention: <domain>.<action> (dot-separated, lowercase)
 */

// ── User lifecycle email jobs ────────────────────────────────────────
export const JOB_EMAIL_USER_REGISTERED = 'email.user.registered';
export const JOB_EMAIL_VERIFY_EMAIL = 'email.verify.email';
export const JOB_EMAIL_RESET_PASSWORD = 'email.reset.password';

// ── Sponsorship interest email jobs ──────────────────────────────────
export const JOB_EMAIL_INTEREST_EXPRESSED = 'email.interest.expressed';

// ── Deal finalized email jobs ─────────────────────────────────────────
export const JOB_EMAIL_DEAL_FINALIZED = 'email.deal.finalized';

// ── Proposal email jobs ──────────────────────────────────────────────
export const JOB_EMAIL_PROPOSAL_SUBMITTED = 'email.proposal.submitted';
export const JOB_EMAIL_PROPOSAL_FORWARDED = 'email.proposal.forwarded';
export const JOB_EMAIL_PROPOSAL_APPROVED = 'email.proposal.approved';
export const JOB_EMAIL_PROPOSAL_REJECTED = 'email.proposal.rejected';
export const JOB_EMAIL_PROPOSAL_CHANGES_REQUESTED = 'email.proposal.changes_requested';

// ── Verification email jobs ──────────────────────────────────────────
export const JOB_EMAIL_COMPANY_VERIFIED = 'email.company.verified';
export const JOB_EMAIL_COMPANY_REJECTED = 'email.company.rejected';
export const JOB_EMAIL_EVENT_VERIFIED = 'email.event.verified';
export const JOB_EMAIL_EVENT_REJECTED = 'email.event.rejected';

// ── Deliverables email jobs ──────────────────────────────────────────
export const JOB_EMAIL_DELIVERABLES_FORM_SENT = 'email.deliverables.form.sent';
export const JOB_EMAIL_DELIVERABLES_BATCH_SENT = 'email.deliverables.batch.sent';

// ── Notification jobs (in-app) ───────────────────────────────────────
export const JOB_NOTIFY_PROPOSAL_SUBMITTED = 'notify.proposal.submitted';
export const JOB_NOTIFY_PROPOSAL_RESUBMITTED = 'notify.proposal.resubmitted';
export const JOB_NOTIFY_PROPOSAL_FORWARDED = 'notify.proposal.forwarded';
export const JOB_NOTIFY_PROPOSAL_APPROVED = 'notify.proposal.approved';
export const JOB_NOTIFY_PROPOSAL_REJECTED = 'notify.proposal.rejected';
export const JOB_NOTIFY_PROPOSAL_CHANGES_REQUESTED = 'notify.proposal.changes_requested';
export const JOB_NOTIFY_COMPANY_VERIFIED = 'notify.company.verified';
export const JOB_NOTIFY_COMPANY_REJECTED = 'notify.company.rejected';
export const JOB_NOTIFY_EVENT_VERIFIED = 'notify.event.verified';
export const JOB_NOTIFY_EVENT_REJECTED = 'notify.event.rejected';
