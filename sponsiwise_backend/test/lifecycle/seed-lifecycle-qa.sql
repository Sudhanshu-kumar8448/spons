-- ============================================================================
-- LIFECYCLE QA TEST DATA — SEED SQL
-- ============================================================================
--
-- Inserts test data for 4 lifecycle validation cases + 1 tenant isolation case
-- + 1 stress test case.
--
-- Run AFTER prisma migrate / prisma db push.
-- Idempotent: uses ON CONFLICT DO NOTHING where possible.
--
-- Password for all seeded users: "TestPass123!"
-- Bcrypt hash ($2b$10$) generated offline for that password.
-- ============================================================================

-- Shared bcrypt hash for "TestPass123!"
-- Generated with: bcrypt.hashSync('TestPass123!', 10)
-- => $2b$10$PLACEHOLDER — will be replaced at runtime by the JS seeder

-- ────────────────────────────────────────────────────────────────────────────
-- TENANT 1 — Primary test tenant
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'QA Test Tenant',
  'qa-test-tenant',
  'ACTIVE',
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- TENANT 2 — For isolation test (Phase 3)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Isolation Tenant',
  'isolation-tenant',
  'ACTIVE',
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- ORGANIZER (Tenant 1)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO organizers (id, tenant_id, name, description, contact_email, is_active, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'QA Organizer Corp',
  'Test organizer for lifecycle QA',
  'organizer@qa-test.com',
  TRUE,
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- COMPANY (Sponsor) — Tenant 1
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO companies (id, tenant_id, name, slug, type, verification_status, is_active, created_at, updated_at)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'QA Sponsor Inc',
  'qa-sponsor-inc',
  'SPONSOR',
  'VERIFIED',
  TRUE,
  NOW() - INTERVAL '28 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO companies (id, tenant_id, name, slug, type, verification_status, is_active, created_at, updated_at)
VALUES (
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'QA Sponsor Two',
  'qa-sponsor-two',
  'SPONSOR',
  'VERIFIED',
  TRUE,
  NOW() - INTERVAL '27 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- USERS — Tenant 1
-- Password placeholder: __BCRYPT_HASH__ (replaced at runtime by JS seeder)
-- ────────────────────────────────────────────────────────────────────────────

-- Manager user
INSERT INTO users (id, tenant_id, email, password, role, is_active, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'manager-qa@test.com',
  '__BCRYPT_HASH__',
  'MANAGER',
  TRUE,
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Organizer user
INSERT INTO users (id, tenant_id, organizer_id, email, password, role, is_active, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'organizer-qa@test.com',
  '__BCRYPT_HASH__',
  'ORGANIZER',
  TRUE,
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sponsor user
INSERT INTO users (id, tenant_id, company_id, email, password, role, is_active, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'sponsor-qa@test.com',
  '__BCRYPT_HASH__',
  'SPONSOR',
  TRUE,
  NOW() - INTERVAL '28 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- USERS — Tenant 2 (isolation test)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO organizers (id, tenant_id, name, description, contact_email, is_active, created_at, updated_at)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  'Isolation Organizer',
  'Organizer in tenant 2',
  'iso-org@test.com',
  TRUE,
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password, role, is_active, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000002',
  'manager-iso@test.com',
  '__BCRYPT_HASH__',
  'MANAGER',
  TRUE,
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASE 1: Event created, no proposals, not verified
-- Expected: progress = 50%, timeline = [EVENT_CREATED]
-- ============================================================================

INSERT INTO events (id, tenant_id, organizer_id, title, description, location, start_date, end_date, status, verification_status, is_active, created_at, updated_at)
VALUES (
  'e1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Case 1 — Bare Event',
  'Event with no proposals and not verified',
  'New York, NY',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '31 days',
  'DRAFT',
  'PENDING',
  TRUE,
  NOW() - INTERVAL '10 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- No proposals, no audit logs, no email logs for Case 1

-- ============================================================================
-- CASE 2: Event verified, 2 proposals, 1 approved, emails SENT
-- Expected: progress > 60%, all emails green, timeline chronological
-- ============================================================================

INSERT INTO events (id, tenant_id, organizer_id, title, description, location, start_date, end_date, status, verification_status, is_active, created_at, updated_at)
VALUES (
  'e2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Case 2 — Verified Event',
  'Event that is verified with proposals and emails',
  'San Francisco, CA',
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '62 days',
  'PUBLISHED',
  'VERIFIED',
  TRUE,
  NOW() - INTERVAL '20 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sponsorship 1
INSERT INTO sponsorships (id, tenant_id, company_id, event_id, status, tier, is_active, created_at, updated_at)
VALUES (
  'f2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000002',
  'ACTIVE',
  'Gold',
  TRUE,
  NOW() - INTERVAL '18 days',
  NOW()
) ON CONFLICT (company_id, event_id) DO NOTHING;

-- Sponsorship 2
INSERT INTO sponsorships (id, tenant_id, company_id, event_id, status, tier, is_active, created_at, updated_at)
VALUES (
  'f2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002',
  'e2000000-0000-0000-0000-000000000002',
  'PENDING',
  'Silver',
  TRUE,
  NOW() - INTERVAL '16 days',
  NOW()
) ON CONFLICT (company_id, event_id) DO NOTHING;

-- Proposal 1 (Approved)
INSERT INTO proposals (id, tenant_id, sponsorship_id, status, proposed_tier, proposed_amount, message, submitted_at, reviewed_at, is_active, created_at, updated_at)
VALUES (
  'aa100000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000001',
  'APPROVED',
  'Gold',
  5000.00,
  'We want gold tier sponsorship',
  NOW() - INTERVAL '17 days',
  NOW() - INTERVAL '15 days',
  TRUE,
  NOW() - INTERVAL '18 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Proposal 2 (Submitted, awaiting decision)
INSERT INTO proposals (id, tenant_id, sponsorship_id, status, proposed_tier, proposed_amount, message, submitted_at, is_active, created_at, updated_at)
VALUES (
  'aa100000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000002',
  'SUBMITTED',
  'Silver',
  2500.00,
  'Interested in silver tier',
  NOW() - INTERVAL '15 days',
  TRUE,
  NOW() - INTERVAL '16 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Audit: event.verified
INSERT INTO audit_logs (id, tenant_id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at)
VALUES (
  'bb100000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'MANAGER',
  'event.verified',
  'Event',
  'e2000000-0000-0000-0000-000000000002',
  '{"status": "VERIFIED"}',
  NOW() - INTERVAL '19 days'
) ON CONFLICT (id) DO NOTHING;

-- Audit: proposal.submitted (proposal 1)
INSERT INTO audit_logs (id, tenant_id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at)
VALUES (
  'bb100000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000003',
  'SPONSOR',
  'proposal.submitted',
  'Proposal',
  'aa100000-0000-0000-0000-000000000001',
  '{"status": "SUBMITTED"}',
  NOW() - INTERVAL '17 days'
) ON CONFLICT (id) DO NOTHING;

-- Audit: proposal.approved (proposal 1)
INSERT INTO audit_logs (id, tenant_id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at)
VALUES (
  'bb100000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'MANAGER',
  'proposal.approved',
  'Proposal',
  'aa100000-0000-0000-0000-000000000001',
  '{"newStatus": "APPROVED"}',
  NOW() - INTERVAL '15 days'
) ON CONFLICT (id) DO NOTHING;

-- Audit: proposal.submitted (proposal 2)
INSERT INTO audit_logs (id, tenant_id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at)
VALUES (
  'bb100000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000003',
  'SPONSOR',
  'proposal.submitted',
  'Proposal',
  'aa100000-0000-0000-0000-000000000002',
  '{"status": "SUBMITTED"}',
  NOW() - INTERVAL '15 days'
) ON CONFLICT (id) DO NOTHING;

-- Email: sent for event verification
INSERT INTO email_logs (id, tenant_id, recipient, subject, job_name, entity_type, entity_id, status, created_at)
VALUES (
  'cc100000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'organizer@qa-test.com',
  'Your event has been verified',
  'event.verified',
  'Event',
  'e2000000-0000-0000-0000-000000000002',
  'SENT',
  NOW() - INTERVAL '19 days'
) ON CONFLICT (id) DO NOTHING;

-- Email: sent for proposal approval
INSERT INTO email_logs (id, tenant_id, recipient, subject, job_name, entity_type, entity_id, status, created_at)
VALUES (
  'cc100000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'sponsor-qa@test.com',
  'Your proposal has been approved',
  'proposal.approved',
  'Proposal',
  'aa100000-0000-0000-0000-000000000001',
  'SENT',
  NOW() - INTERVAL '15 days'
) ON CONFLICT (id) DO NOTHING;

-- Email: sent for proposal submission notification
INSERT INTO email_logs (id, tenant_id, recipient, subject, job_name, entity_type, entity_id, status, created_at)
VALUES (
  'cc100000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'organizer@qa-test.com',
  'New proposal submitted',
  'proposal.submitted',
  'Proposal',
  'aa100000-0000-0000-0000-000000000002',
  'SENT',
  NOW() - INTERVAL '15 days'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASE 3: Event with FAILED email
-- Expected: red indicator, FAILED email NOT counted in progress
-- ============================================================================

INSERT INTO events (id, tenant_id, organizer_id, title, description, location, start_date, end_date, status, verification_status, is_active, created_at, updated_at)
VALUES (
  'e3000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Case 3 — Failed Email Event',
  'Event with a failed email delivery',
  'Chicago, IL',
  NOW() + INTERVAL '45 days',
  NOW() + INTERVAL '46 days',
  'PUBLISHED',
  'VERIFIED',
  TRUE,
  NOW() - INTERVAL '14 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Audit: event.verified
INSERT INTO audit_logs (id, tenant_id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at)
VALUES (
  'bb300000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'MANAGER',
  'event.verified',
  'Event',
  'e3000000-0000-0000-0000-000000000003',
  '{"status": "VERIFIED"}',
  NOW() - INTERVAL '13 days'
) ON CONFLICT (id) DO NOTHING;

-- Email: SENT for verification
INSERT INTO email_logs (id, tenant_id, recipient, subject, job_name, entity_type, entity_id, status, created_at)
VALUES (
  'cc300000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'organizer@qa-test.com',
  'Your event has been verified',
  'event.verified',
  'Event',
  'e3000000-0000-0000-0000-000000000003',
  'SENT',
  NOW() - INTERVAL '13 days'
) ON CONFLICT (id) DO NOTHING;

-- Email: FAILED
INSERT INTO email_logs (id, tenant_id, recipient, subject, job_name, entity_type, entity_id, status, error_message, created_at)
VALUES (
  'cc300000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'bad-address@invalid.fake',
  'Event verification notification',
  'event.verified',
  'Event',
  'e3000000-0000-0000-0000-000000000003',
  'FAILED',
  'SMTP error: 550 Mailbox not found',
  NOW() - INTERVAL '13 days'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASE 4: Duplicate email logs (deduplication test)
-- Expected: timeline deduplicated — no duplicate visual entries
-- ============================================================================

INSERT INTO events (id, tenant_id, organizer_id, title, description, location, start_date, end_date, status, verification_status, is_active, created_at, updated_at)
VALUES (
  'e4000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Case 4 — Dedup Event',
  'Event with duplicate email logs for deduplication testing',
  'Austin, TX',
  NOW() + INTERVAL '90 days',
  NOW() + INTERVAL '92 days',
  'PUBLISHED',
  'VERIFIED',
  TRUE,
  NOW() - INTERVAL '8 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Audit: event.verified
INSERT INTO audit_logs (id, tenant_id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at)
VALUES (
  'bb400000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'MANAGER',
  'event.verified',
  'Event',
  'e4000000-0000-0000-0000-000000000004',
  '{"status": "VERIFIED"}',
  NOW() - INTERVAL '7 days'
) ON CONFLICT (id) DO NOTHING;

-- Duplicate email log 1 (same second)
INSERT INTO email_logs (id, tenant_id, recipient, subject, job_name, entity_type, entity_id, status, created_at)
VALUES (
  'cc400000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'organizer@qa-test.com',
  'Event verified',
  'event.verified',
  'Event',
  'e4000000-0000-0000-0000-000000000004',
  'SENT',
  NOW() - INTERVAL '7 days'
) ON CONFLICT (id) DO NOTHING;

-- Duplicate email log 2 (same entity, same type, same second — should be deduped)
INSERT INTO email_logs (id, tenant_id, recipient, subject, job_name, entity_type, entity_id, status, created_at)
VALUES (
  'cc400000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'organizer@qa-test.com',
  'Event verified',
  'event.verified',
  'Event',
  'e4000000-0000-0000-0000-000000000004',
  'SENT',
  NOW() - INTERVAL '7 days'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TENANT ISOLATION TEST (Phase 3)
-- Event in Tenant 2 — must NOT be visible from Tenant 1 JWT
-- ============================================================================

INSERT INTO events (id, tenant_id, organizer_id, title, description, location, start_date, end_date, status, verification_status, is_active, created_at, updated_at)
VALUES (
  'e5000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'Isolation Event',
  'This event belongs to tenant 2',
  'Boston, MA',
  NOW() + INTERVAL '50 days',
  NOW() + INTERVAL '51 days',
  'PUBLISHED',
  'VERIFIED',
  TRUE,
  NOW() - INTERVAL '5 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EDGE CASE (Phase 5): Event REJECTED instead of verified
-- ============================================================================

INSERT INTO events (id, tenant_id, organizer_id, title, description, location, start_date, end_date, status, verification_status, is_active, created_at, updated_at)
VALUES (
  'e6000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Edge — Rejected Event',
  'Event that was rejected',
  'Denver, CO',
  NOW() + INTERVAL '70 days',
  NOW() + INTERVAL '71 days',
  'DRAFT',
  'REJECTED',
  TRUE,
  NOW() - INTERVAL '12 days',
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id, tenant_id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at)
VALUES (
  'bb600000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'MANAGER',
  'event.rejected',
  'Event',
  'e6000000-0000-0000-0000-000000000006',
  '{"status": "REJECTED"}',
  NOW() - INTERVAL '11 days'
) ON CONFLICT (id) DO NOTHING;
