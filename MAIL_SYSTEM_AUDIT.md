# SponsiWise Mail System Audit (Backend + Frontend)

Audit date: 2026-03-08
Scope: current implementation under `sponsiwise_backend` and `sponsiwise-frontend`

## 1) Template Location (Correct Path)
Your templates are in:

- `sponsiwise_backend/src/jobs/services/templates/`

(The long repeated path in your message is not a valid filesystem path.)

## 2) Current Email Architecture

### Backend flow
1. Business action happens in a service (auth/proposals/sponsorship/manager/deliverables).
2. Service emits a domain event (`@nestjs/event-emitter`).
3. A BullMQ producer listens to that event and enqueues an email job.
4. `EmailProcessor` consumes the job from `QUEUE_EMAIL`.
5. `EmailService` sends through Resend (`RESEND_API_KEY`) and writes delivery logs to `email_logs` table.

### Key modules/files
- Queue + producers: `sponsiwise_backend/src/jobs/queue.module.ts`
- Workers/processors: `sponsiwise_backend/src/jobs/worker.module.ts`, `sponsiwise_backend/src/jobs/processors/email.processor.ts`
- Sender service: `sponsiwise_backend/src/jobs/services/email.service.ts`
- Email logs API: `GET /manager/email-logs`

## 3) Template + Trigger Mapping (What is wired)

- `welcome.template.ts`
  - Job: `email.user.registered`
  - Trigger: `AuthService.register()` emits `user.registered`
  - Recipient: new user

- `interest-expressed.template.ts`
  - Job: `email.interest.expressed`
  - Trigger: `SponsorshipService.create()` emits `interest.expressed`
  - Recipient: organizer + brand + manager/admin

- `proposal-submitted.template.ts`
  - Job: `email.proposal.submitted`
  - Trigger: `ProposalCreatedEvent`
  - Recipient: organizer

- `proposal-approved.template.ts`
  - Job: `email.proposal.approved`
  - Trigger: `ProposalStatusChangedEvent` (`APPROVED`)
  - Recipient: sponsor/brand

- `proposal-rejected.template.ts`
  - Job: `email.proposal.rejected`
  - Trigger: `ProposalStatusChangedEvent` (`REJECTED`)
  - Recipient: sponsor/brand

- `deal-finalized.template.ts`
  - Job: `email.deal.finalized`
  - Trigger: when proposal status becomes `APPROVED`
  - Recipient: organizer + sponsor + admin

- `event-verified.template.ts`, `event-rejected.template.ts`
  - Jobs: `email.event.verified`, `email.event.rejected`
  - Trigger: manager verifies/rejects event
  - Recipient: organizer

- `company-verified.template.ts`, `company-rejected.template.ts`
  - Jobs: `email.company.verified`, `email.company.rejected`
  - Trigger: manager verifies/rejects company
  - Recipient: all users in that company

- `deliverables-form-sent.template.ts`
  - Job: `email.deliverables.form.sent`
  - Trigger: manager sends deliverable form to organizer
  - Recipient: organizer

## 4) Frontend Integration Reality

### Implemented frontend auth actions
- Register: `/auth/register`
- Login: `/auth/login`
- Change password (while logged in): `/auth/change-password`

### Missing frontend auth actions
- No “Verify email” page/flow
- No “Forgot password” page/flow
- No “Reset password from email token” page/flow

### Sponsor proposal path (important)
Frontend uses `/sponsor/proposals` (via `sponsiwise-frontend/src/lib/sponsor-api.ts`).
This writes proposals in `SponsorService.createProposal()` but **does not emit proposal events**.
So proposal submission emails are not guaranteed for normal sponsor UI flow.

## 5) Status Against Your 4 Requirements

### Requirement 1
"When register new user, verify email by link; forgot password via email verification"

Status: **NOT IMPLEMENTED**

What exists:
- Welcome email after registration.
- Logged-in password change endpoint (`PATCH /auth/change-password`).

What is missing:
- User email verification token model/fields.
- Verify-email endpoint.
- Verify-email email template + job.
- Forgot-password endpoint (request reset).
- Reset-password endpoint (token + new password).
- Forgot/reset templates + frontend pages.

### Requirement 2
"Express interest or submit proposal mail to organizer, brand, manager"

Status: **PARTIAL**

What works:
- `interest-expressed` mail sends to organizer + brand + manager/admin.

Gaps:
- Real sponsor proposal submit path does not emit proposal events.
- Proposal-submitted mail currently targets organizer only, not brand/manager.
- Existing interest trigger is on admin `POST /sponsorships`, not the sponsor UI proposal path.

### Requirement 3
"Event verification mail to organizer or deliverables form filling mail"

Status: **MOSTLY IMPLEMENTED**

What works:
- Event verified/rejected mails to organizer are implemented.
- Deliverable form sent-to-organizer mail is implemented.

Gap:
- When organizer submits filled deliverables, only in-app notification exists (no email to manager).

### Requirement 4
"Deal finalized mail to admin, manager, organizer, sponsor"

Status: **PARTIAL**

What works:
- Deal finalized mail goes to organizer + sponsor + admin.

Gap:
- Manager is not included in deal-finalized recipients.

## 6) Critical Configuration Checks

For production mail sending, confirm all of these are set:
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `FRONTEND_URL`
- `REDIS_HOST`, `REDIS_PORT`, optional `REDIS_PASSWORD`, `REDIS_DB`

If `RESEND_API_KEY` is missing, `EmailService` skips sending.

## 7) Broken CTA Links in Current Templates

These template URLs do not match existing frontend routes:
- `welcome.template.ts` default `/dashboard` (route not present)
- `interest-expressed.template.ts` brand `/brand/sponsorships/:id` (missing)
- `interest-expressed.template.ts` manager `/manager/events/:id` (missing)
- `proposal-submitted.template.ts` `/organizer/proposals` (actual route uses `/organizer/events/proposals`)
- `proposal-rejected.template.ts` `/brand/events` (actual browse route is `/brand/browseEvents`)
- `company-rejected.template.ts` `/brand/profile` (missing)
- `deal-finalized.template.ts` admin `/admin/proposals/:id` (missing)

## 8) Extra Technical Findings

- `DealFinalizedEvent` class exists but is not used as an emitted event path.
- Manager proposal review API (`PATCH /manager/proposals/:id`) updates statuses without emitting proposal-status events, so rejection/notification emails can be skipped on that path.

## 9) Verification Checklist (How to test quickly)

1. Trigger each business flow from UI/API.
2. Confirm a BullMQ job is enqueued (email queue).
3. Confirm processor runs without error.
4. Check `GET /manager/email-logs` for `SENT`/`FAILED`.
5. Click CTA link from received email and confirm route resolves.

## 10) Implementation Prompt (Copy/Paste)

Use this prompt to implement missing work safely:

```text
You are working on the SponsiWise monorepo. Implement and complete the mail trigger system end-to-end with backend + frontend parity.

Goals:
1) Registration email verification:
- Add email verification token flow.
- On register, create verification token (hashed in DB), send verification email with clickable link.
- Add verify endpoint that marks user as verified.
- Block login for unverified users (except if explicitly allowed by product decision).

2) Forgot password flow:
- Add POST /auth/forgot-password (always generic success response to avoid email enumeration).
- Add POST /auth/reset-password with token + new password.
- Store reset token hashed with expiry.
- Revoke active refresh tokens after reset.

3) Proposal/interest email triggers:
- Ensure sponsor UI path (/sponsor/proposals) emits the same proposal domain events as proposal service, or refactor to reuse proposal service.
- Ensure requirement coverage for recipients: organizer + brand + manager where required.
- Ensure manager proposal actions emit status-change events when status changes.

4) Deal finalized recipients:
- Include manager recipients in deal-finalized emails in addition to admin/organizer/sponsor.

5) Template links:
- Fix all CTA URLs to existing frontend routes.
- Keep URL generation centralized and route-safe.

6) Frontend pages:
- Add public pages for verify-email, forgot-password, reset-password.
- Add clear success/error states and token-expired handling.

7) Templates:
- Add templates for verify-email and reset-password.
- Keep consistent style with existing mail layout.

8) Testing and validation:
- Add/update unit tests for auth token generation/validation/expiry and event emission.
- Add integration tests for key mail-triggering endpoints.
- Verify with /manager/email-logs and ensure no duplicate sends for same deterministic job id.

Constraints:
- Use existing BullMQ + event-emitter architecture.
- Hash all sensitive tokens before persistence.
- Keep API responses backward-compatible where possible.
- Do not break current login/register flows without migration notes.

Deliverables:
- Backend code changes + Prisma migration.
- Frontend pages + form actions.
- Updated template files and corrected links.
- A short markdown changelog listing each trigger and its recipients.
```
