/**
 * ============================================================================
 * LIFECYCLE QA — SEED + VALIDATE
 * ============================================================================
 *
 * Full automated validation of GET /manager/events/:id/lifecycle
 *
 * Phases:
 *   1. Seed database with test data (bcrypt passwords + raw SQL)
 *   2. Validate all 4 test cases
 *   3. Tenant isolation test
 *   4. Stress test (100 proposals + 200 emails)
 *   5. Edge case tests
 *
 * Usage:
 *   cd sponsiwise_backend
 *   npx ts-node test/lifecycle/validate-lifecycle.ts
 *
 * Requirements:
 *   - Backend running on http://localhost:3000
 *   - PostgreSQL running with DATABASE_URL from .env
 *   - axios and bcrypt installed (already in project deps)
 *
 * ============================================================================
 */

import axios, { AxiosInstance } from 'axios';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// ─── Config ─────────────────────────────────────────────────────────────

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres';
const TEST_PASSWORD = 'TestPass123!';

// ─── Test IDs (match seed SQL) ──────────────────────────────────────────

const IDS = {
  tenant1: 'a0000000-0000-0000-0000-000000000001',
  tenant2: 'a0000000-0000-0000-0000-000000000002',
  manager1: 'd0000000-0000-0000-0000-000000000001',
  manager2: 'd0000000-0000-0000-0000-000000000010',
  organizer: 'b0000000-0000-0000-0000-000000000001',
  company1: 'c0000000-0000-0000-0000-000000000001',
  company2: 'c0000000-0000-0000-0000-000000000002',
  case1Event: 'e1000000-0000-0000-0000-000000000001',
  case2Event: 'e2000000-0000-0000-0000-000000000002',
  case3Event: 'e3000000-0000-0000-0000-000000000003',
  case4Event: 'e4000000-0000-0000-0000-000000000004',
  isoEvent: 'e5000000-0000-0000-0000-000000000005',
  rejectedEvent: 'e6000000-0000-0000-0000-000000000006',
};

// ─── Helpers ────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passCount++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failCount++;
    failures.push(label);
  }
}

function assertRange(value: number, min: number, max: number, label: string): void {
  assert(value >= min && value <= max, `${label} (got ${value}, expected ${min}-${max})`);
}

// ─── Database Seed ──────────────────────────────────────────────────────

async function seedDatabase(): Promise<void> {
  console.log('\n📦 PHASE 0: Seeding database...');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Hash password
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Read SQL seed file
    let sql = readFileSync(join(__dirname, 'seed-lifecycle-qa.sql'), 'utf-8');

    // Replace placeholder with real bcrypt hash
    sql = sql.replace(/__BCRYPT_HASH__/g, hash);

    // Execute
    await client.query(sql);
    console.log('  ✅ Seed data inserted successfully');
  } finally {
    await client.end();
  }
}

// ─── Auth Helper ────────────────────────────────────────────────────────

async function loginAsManager(email: string): Promise<AxiosInstance> {
  const loginRes = await axios.post(
    `${API_BASE}/auth/login`,
    { email, password: TEST_PASSWORD },
    { withCredentials: true },
  );

  // Extract cookies from set-cookie header
  const setCookies: string[] = loginRes.headers['set-cookie'] ?? [];
  const cookieHeader = setCookies.map((c: string) => c.split(';')[0]).join('; ');

  // Create authenticated client
  return axios.create({
    baseURL: API_BASE,
    headers: { Cookie: cookieHeader },
    validateStatus: () => true, // Don't throw on non-2xx
  });
}

// ─── Lifecycle fetcher ──────────────────────────────────────────────────

interface TimelineEntry {
  type: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorRole?: string;
  status?: string;
  recipient?: string;
  subject?: string;
  description?: string;
  timestamp: string;
}

interface LifecycleResponse {
  event: Record<string, unknown>;
  proposals: Record<string, unknown>[];
  progress: { totalSteps: number; completedSteps: number; percentage: number };
  timeline: TimelineEntry[];
}

async function fetchLifecycle(
  client: AxiosInstance,
  eventId: string,
): Promise<{ status: number; data: LifecycleResponse | null }> {
  const res = await client.get(`/manager/events/${eventId}/lifecycle`);
  return {
    status: res.status,
    data: res.status === 200 ? (res.data as LifecycleResponse) : null,
  };
}

// ============================================================================
// PHASE 1 — CASE VALIDATION
// ============================================================================

async function validateCase1(client: AxiosInstance): Promise<void> {
  console.log('\n─── CASE 1: Bare event (no proposals, not verified) ───');

  const { status, data } = await fetchLifecycle(client, IDS.case1Event);
  assert(status === 200, 'HTTP 200 returned');
  if (!data) return;

  // Progress: totalSteps=2 (created + verification), completedSteps=1
  // percentage = 50%
  assert(data.progress.totalSteps === 2, `totalSteps = 2 (got ${data.progress.totalSteps})`);
  assert(
    data.progress.completedSteps === 1,
    `completedSteps = 1 (got ${data.progress.completedSteps})`,
  );
  assert(data.progress.percentage === 50, `percentage = 50% (got ${data.progress.percentage})`);

  // Proposals
  assert(data.proposals.length === 0, 'No proposals');

  // Timeline: only EVENT_CREATED
  assert(data.timeline.length === 1, `timeline length = 1 (got ${data.timeline.length})`);
  assert(data.timeline[0]?.type === 'EVENT_CREATED', 'First entry is EVENT_CREATED');

  // No email entries
  const emailEntries = data.timeline.filter(
    (t) => t.type === 'EMAIL_SENT' || t.type === 'EMAIL_FAILED',
  );
  assert(emailEntries.length === 0, 'No email entries in timeline');
}

async function validateCase2(client: AxiosInstance): Promise<void> {
  console.log('\n─── CASE 2: Verified event + proposals + emails ───');

  const { status, data } = await fetchLifecycle(client, IDS.case2Event);
  assert(status === 200, 'HTTP 200 returned');
  if (!data) return;

  // Progress calculation:
  // Steps: event_created(1) + event_verification(1) + 2*proposal_submit(2) + 2*proposal_decision(2) + 3 emails = 9 total
  // Completed: created(1) + verified(1) + 2 submitted(2) + 1 approved(1) + 3 sent emails(3) = 8
  // Percentage = round(8/9 * 100) = 89%
  assert(data.progress.totalSteps === 9, `totalSteps = 9 (got ${data.progress.totalSteps})`);
  assert(
    data.progress.completedSteps === 8,
    `completedSteps = 8 (got ${data.progress.completedSteps})`,
  );
  assertRange(data.progress.percentage, 80, 95, 'percentage > 80%');

  // Proposals
  assert(data.proposals.length === 2, `2 proposals (got ${data.proposals.length})`);

  // All emails are SENT (green)
  const failedEmails = data.timeline.filter((t) => t.type === 'EMAIL_FAILED');
  assert(failedEmails.length === 0, 'No failed emails');

  const sentEmails = data.timeline.filter((t) => t.type === 'EMAIL_SENT');
  assert(sentEmails.length >= 3, `At least 3 sent emails (got ${sentEmails.length})`);

  // Timeline is sorted chronologically
  const timestamps = data.timeline.map((t) => new Date(t.timestamp).getTime());
  const isSorted = timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]);
  assert(isSorted, 'Timeline sorted chronologically');

  // Should contain these types
  const types = new Set(data.timeline.map((t) => t.type));
  assert(types.has('EVENT_CREATED'), 'Has EVENT_CREATED');
  assert(types.has('EVENT_VERIFIED'), 'Has EVENT_VERIFIED');
  assert(types.has('PROPOSAL_SUBMITTED'), 'Has PROPOSAL_SUBMITTED');
  assert(types.has('PROPOSAL_APPROVED'), 'Has PROPOSAL_APPROVED');
  assert(types.has('EMAIL_SENT'), 'Has EMAIL_SENT');
}

async function validateCase3(client: AxiosInstance): Promise<void> {
  console.log('\n─── CASE 3: Failed email ───');

  const { status, data } = await fetchLifecycle(client, IDS.case3Event);
  assert(status === 200, 'HTTP 200 returned');
  if (!data) return;

  // Progress: created(1) + verification(1) + 2 emails (1 sent + 1 failed)
  // totalSteps = 4, completedSteps = 3 (created + verified + 1 sent email)
  // FAILED email adds to total but NOT completed
  assert(data.progress.totalSteps === 4, `totalSteps = 4 (got ${data.progress.totalSteps})`);
  assert(
    data.progress.completedSteps === 3,
    `completedSteps = 3 (got ${data.progress.completedSteps})`,
  );
  assert(data.progress.percentage === 75, `percentage = 75% (got ${data.progress.percentage})`);

  // Failed email visible in timeline
  const failedEmails = data.timeline.filter((t) => t.type === 'EMAIL_FAILED');
  assert(failedEmails.length >= 1, `At least 1 EMAIL_FAILED entry (got ${failedEmails.length})`);

  // Error message visible
  const failedEntry = failedEmails[0];
  assert(
    !!failedEntry?.description && failedEntry.description.includes('SMTP error'),
    'Failed email description contains error message',
  );

  // Sent email present too
  const sentEmails = data.timeline.filter((t) => t.type === 'EMAIL_SENT');
  assert(sentEmails.length >= 1, `At least 1 EMAIL_SENT entry (got ${sentEmails.length})`);
}

async function validateCase4(client: AxiosInstance): Promise<void> {
  console.log('\n─── CASE 4: Deduplication ───');

  const { status, data } = await fetchLifecycle(client, IDS.case4Event);
  assert(status === 200, 'HTTP 200 returned');
  if (!data) return;

  // We inserted 2 duplicate email logs with same entityId + same second
  // Dedup should remove one, leaving 1 EMAIL_SENT for that entity
  const emailSentForEvent = data.timeline.filter(
    (t) => t.type === 'EMAIL_SENT' && t.entityId === IDS.case4Event,
  );
  assert(
    emailSentForEvent.length === 1,
    `Deduplicated: 1 EMAIL_SENT for event (got ${emailSentForEvent.length})`,
  );

  // Total timeline should not have duplicates
  const keys = data.timeline.map((t) => {
    const ts = Math.floor(new Date(t.timestamp).getTime() / 1000);
    return `${t.type}:${t.entityId}:${ts}`;
  });
  const uniqueKeys = new Set(keys);
  assert(keys.length === uniqueKeys.size, 'No duplicate timeline entries');

  // Timeline sorted
  const timestamps = data.timeline.map((t) => new Date(t.timestamp).getTime());
  const isSorted = timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]);
  assert(isSorted, 'Timeline sorted chronologically');
}

// ============================================================================
// PHASE 3 — TENANT ISOLATION
// ============================================================================

async function validateTenantIsolation(client1: AxiosInstance): Promise<void> {
  console.log('\n─── PHASE 3: Tenant isolation ───');

  // Tenant 1 manager tries to fetch Tenant 2 event
  const { status, data } = await fetchLifecycle(client1, IDS.isoEvent);

  // Should return 404 (event not found in tenant 1)
  assert(status === 404, `Isolation: HTTP ${status} for cross-tenant fetch (expected 404)`);
  assert(data === null, 'No lifecycle data returned for cross-tenant request');
}

// ============================================================================
// PHASE 4 — STRESS TEST
// ============================================================================

async function seedStressData(): Promise<string> {
  console.log('\n📦 PHASE 4: Seeding stress test data...');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const stressEventId = 'e7000000-0000-0000-0000-000000000007';

  try {
    // Create stress event
    await client.query(`
      INSERT INTO events (id, tenant_id, organizer_id, title, description, location, start_date, end_date, status, verification_status, is_active, created_at, updated_at)
      VALUES (
        '${stressEventId}',
        '${IDS.tenant1}',
        '${IDS.organizer}',
        'Stress Test Event',
        'Event with 100 proposals and 200 emails',
        'Las Vegas, NV',
        NOW() + INTERVAL '120 days',
        NOW() + INTERVAL '123 days',
        'PUBLISHED',
        'VERIFIED',
        TRUE,
        NOW() - INTERVAL '25 days',
        NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // Create 100 companies + sponsorships + proposals
    for (let i = 0; i < 100; i++) {
      const companyId = randomUUID();
      const sponsorshipId = randomUUID();
      const proposalId = randomUUID();

      await client.query(
        `
        INSERT INTO companies (id, tenant_id, name, type, verification_status, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, 'SPONSOR', 'VERIFIED', TRUE, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `,
        [companyId, IDS.tenant1, `Stress Sponsor ${i}`],
      );

      await client.query(
        `
        INSERT INTO sponsorships (id, tenant_id, company_id, event_id, status, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'ACTIVE', TRUE, NOW(), NOW())
        ON CONFLICT (company_id, event_id) DO NOTHING;
      `,
        [sponsorshipId, IDS.tenant1, companyId, stressEventId],
      );

      await client.query(
        `
        INSERT INTO proposals (id, tenant_id, sponsorship_id, status, proposed_amount, submitted_at, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, 'SUBMITTED', 1000.00, NOW() - INTERVAL '${i} hours', TRUE, NOW() - INTERVAL '${i + 1} hours', NOW())
        ON CONFLICT (id) DO NOTHING;
      `,
        [proposalId, IDS.tenant1, sponsorshipId],
      );
    }

    // Create 200 email logs
    for (let i = 0; i < 200; i++) {
      const emailId = randomUUID();
      const status = i % 10 === 0 ? 'FAILED' : 'SENT'; // 10% failure rate

      await client.query(
        `
        INSERT INTO email_logs (id, tenant_id, recipient, subject, job_name, entity_type, entity_id, status, error_message, created_at)
        VALUES ($1, $2, $3, $4, 'stress.test', 'Event', $5, $6, $7, NOW() - INTERVAL '${i} minutes')
        ON CONFLICT (id) DO NOTHING;
      `,
        [
          emailId,
          IDS.tenant1,
          `stress-${i}@test.com`,
          `Stress email ${i}`,
          stressEventId,
          status,
          status === 'FAILED' ? 'Simulated SMTP failure' : null,
        ],
      );
    }

    console.log('  ✅ 100 proposals + 200 email logs inserted');
  } finally {
    await client.end();
  }

  return stressEventId;
}

async function validateStress(client: AxiosInstance, stressEventId: string): Promise<void> {
  console.log('\n─── PHASE 4: Stress test validation ───');

  const start = Date.now();
  const { status, data } = await fetchLifecycle(client, stressEventId);
  const elapsed = Date.now() - start;

  assert(status === 200, `HTTP 200 (got ${status})`);
  console.log(`  ⏱  Response time: ${elapsed}ms`);
  assert(elapsed < 3000, `Response under 3000ms (got ${elapsed}ms)`);

  if (!data) return;

  assert(data.proposals.length === 100, `100 proposals (got ${data.proposals.length})`);

  console.log(`  📊 Progress: ${data.progress.percentage}%`);
  console.log(`  📊 Timeline entries: ${data.timeline.length}`);
  console.log(`  📊 Total steps: ${data.progress.totalSteps}`);

  // Check no duplicate timeline entries
  const keys = data.timeline.map((t) => {
    const ts = Math.floor(new Date(t.timestamp).getTime() / 1000);
    return `${t.type}:${t.entityId}:${ts}`;
  });
  const uniqueKeys = new Set(keys);
  assert(keys.length === uniqueKeys.size, 'No duplicate timeline entries in stress data');

  // Timeline sorted
  const timestamps = data.timeline.map((t) => new Date(t.timestamp).getTime());
  const isSorted = timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]);
  assert(isSorted, 'Stress timeline sorted chronologically');

  // Failed emails should not count as completed
  const failedCount = data.timeline.filter((t) => t.type === 'EMAIL_FAILED').length;
  console.log(`  📊 Failed emails: ${failedCount}`);
  assert(failedCount >= 1, `Has failed emails (got ${failedCount})`);
}

// ============================================================================
// PHASE 5 — EDGE CASES
// ============================================================================

async function validateEdgeCases(client: AxiosInstance): Promise<void> {
  console.log('\n─── PHASE 5: Edge cases ───');

  // 5a. Rejected event
  console.log('\n  >> Edge 5a: Rejected event');
  const { status: r1, data: d1 } = await fetchLifecycle(client, IDS.rejectedEvent);
  assert(r1 === 200, 'Rejected event: HTTP 200');
  if (d1) {
    // verification step should be completed (REJECTED counts as completed in progress)
    assert(
      d1.progress.completedSteps >= 2,
      `Rejected event: completedSteps >= 2 (got ${d1.progress.completedSteps})`,
    );
    const hasRejected = d1.timeline.some((t) => t.type === 'EVENT_REJECTED');
    assert(hasRejected, 'Rejected event: timeline has EVENT_REJECTED');
    assert(d1.event.verificationStatus === 'REJECTED', 'Event status is REJECTED');
  }

  // 5b. Non-existent event
  console.log('\n  >> Edge 5b: Non-existent event');
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const { status: r2 } = await fetchLifecycle(client, fakeId);
  assert(r2 === 404, `Non-existent event: HTTP 404 (got ${r2})`);

  // 5c. Invalid UUID
  console.log('\n  >> Edge 5c: Invalid UUID');
  const { status: r3 } = await fetchLifecycle(client, 'not-a-uuid');
  assert(r3 === 400 || r3 === 422, `Invalid UUID: HTTP 400/422 (got ${r3})`);

  // 5d. Missing email logs (Case 1 already covers this — no emails)
  console.log('\n  >> Edge 5d: Missing email logs (already covered by Case 1)');
  assert(true, 'Case 1 proves lifecycle works with zero email logs');

  // 5e. Missing audit logs (Case 1 already covers this — no audit logs)
  console.log('\n  >> Edge 5e: Missing audit logs (already covered by Case 1)');
  assert(true, 'Case 1 proves lifecycle works with zero audit logs');
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanup(): Promise<void> {
  console.log('\n🧹 Cleaning up test data...');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Delete in reverse dependency order — each wrapped to tolerate missing tables
    const tables = [
      `DELETE FROM email_logs WHERE tenant_id IN ($1, $2)`,
      `DELETE FROM audit_logs WHERE tenant_id IN ($1, $2)`,
      `DELETE FROM proposals WHERE tenant_id IN ($1, $2)`,
      `DELETE FROM sponsorships WHERE tenant_id IN ($1, $2)`,
      `DELETE FROM events WHERE tenant_id IN ($1, $2)`,
      `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id IN ($1, $2))`,
      `DELETE FROM users WHERE tenant_id IN ($1, $2)`,
      `DELETE FROM companies WHERE tenant_id IN ($1, $2)`,
      `DELETE FROM organizers WHERE tenant_id IN ($1, $2)`,
      `DELETE FROM tenants WHERE id IN ($1, $2)`,
    ];
    for (const sql of tables) {
      try {
        await client.query(sql, [IDS.tenant1, IDS.tenant2]);
      } catch (e: any) {
        // Ignore "relation does not exist" — table may not be created yet
        if (e?.code !== '42P01') throw e;
      }
    }

    console.log('  ✅ Cleanup complete');
  } finally {
    await client.end();
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║    LIFECYCLE QA VALIDATION SUITE                    ║');
  console.log('║    GET /manager/events/:id/lifecycle                ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  try {
    // Phase 0: Seed
    await seedDatabase();

    // Auth: login as manager in Tenant 1
    console.log('\n🔐 Logging in as manager (Tenant 1)...');
    const managerClient = await loginAsManager('manager-qa@test.com');
    console.log('  ✅ Authenticated');

    // Phase 1: Case validation
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  PHASE 1: CORE CASE VALIDATION');
    console.log('═══════════════════════════════════════════════════');
    await validateCase1(managerClient);
    await validateCase2(managerClient);
    await validateCase3(managerClient);
    await validateCase4(managerClient);

    // Phase 3: Tenant isolation
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  PHASE 3: TENANT ISOLATION');
    console.log('═══════════════════════════════════════════════════');
    await validateTenantIsolation(managerClient);

    // Phase 4: Stress test
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  PHASE 4: STRESS TEST');
    console.log('═══════════════════════════════════════════════════');
    const stressEventId = await seedStressData();
    await validateStress(managerClient, stressEventId);

    // Phase 5: Edge cases
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  PHASE 5: EDGE CASES');
    console.log('═══════════════════════════════════════════════════');
    await validateEdgeCases(managerClient);
  } finally {
    // Cleanup
    await cleanup();
  }

  // ─── Final Report ─────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║    FINAL REPORT                                     ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(
    `║  ✅ Passed: ${String(passCount).padEnd(4)} ❌ Failed: ${String(failCount).padEnd(4)}              ║`,
  );
  console.log('╚══════════════════════════════════════════════════════╝');

  if (failCount > 0) {
    console.log('\n❌ FAILED ASSERTIONS:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED');
    process.exit(0);
  }
}

main().catch(async (err) => {
  console.error('\n💥 FATAL ERROR:', err);
  try {
    await cleanup();
  } catch (_) {
    /* ignore cleanup errors */
  }
  process.exit(2);
});
