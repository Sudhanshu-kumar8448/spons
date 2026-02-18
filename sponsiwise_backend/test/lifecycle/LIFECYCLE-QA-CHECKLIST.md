# Lifecycle QA — Expected Output & Checklist

## How to Run

```bash
cd sponsiwise_backend

# 1. Make sure backend is running
npm run start:dev

# 2. Run the validation suite
npx ts-node test/lifecycle/validate-lifecycle.ts
```

---

## Expected Console Output

```
╔══════════════════════════════════════════════════════╗
║    LIFECYCLE QA VALIDATION SUITE                    ║
║    GET /manager/events/:id/lifecycle                ║
╚══════════════════════════════════════════════════════╝

📦 PHASE 0: Seeding database...
  ✅ Seed data inserted successfully

🔐 Logging in as manager (Tenant 1)...
  ✅ Authenticated

═══════════════════════════════════════════════════════
  PHASE 1: CORE CASE VALIDATION
═══════════════════════════════════════════════════════

─── CASE 1: Bare event (no proposals, not verified) ───
  ✅ PASS: HTTP 200 returned
  ✅ PASS: totalSteps = 2 (got 2)
  ✅ PASS: completedSteps = 1 (got 1)
  ✅ PASS: percentage = 50% (got 50)
  ✅ PASS: No proposals
  ✅ PASS: timeline length = 1 (got 1)
  ✅ PASS: First entry is EVENT_CREATED
  ✅ PASS: No email entries in timeline

─── CASE 2: Verified event + proposals + emails ───
  ✅ PASS: HTTP 200 returned
  ✅ PASS: totalSteps = 9 (got 9)
  ✅ PASS: completedSteps = 8 (got 8)
  ✅ PASS: percentage > 80% (got 89, expected 80-95)
  ✅ PASS: 2 proposals (got 2)
  ✅ PASS: No failed emails
  ✅ PASS: At least 3 sent emails (got 3)
  ✅ PASS: Timeline sorted chronologically
  ✅ PASS: Has EVENT_CREATED
  ✅ PASS: Has EVENT_VERIFIED
  ✅ PASS: Has PROPOSAL_SUBMITTED
  ✅ PASS: Has PROPOSAL_APPROVED
  ✅ PASS: Has EMAIL_SENT

─── CASE 3: Failed email ───
  ✅ PASS: HTTP 200 returned
  ✅ PASS: totalSteps = 4 (got 4)
  ✅ PASS: completedSteps = 3 (got 3)
  ✅ PASS: percentage = 75% (got 75)
  ✅ PASS: At least 1 EMAIL_FAILED entry (got 1)
  ✅ PASS: Failed email description contains error message
  ✅ PASS: At least 1 EMAIL_SENT entry (got 1)

─── CASE 4: Deduplication ───
  ✅ PASS: HTTP 200 returned
  ✅ PASS: Deduplicated: 1 EMAIL_SENT for event (got 1)
  ✅ PASS: No duplicate timeline entries
  ✅ PASS: Timeline sorted chronologically

═══════════════════════════════════════════════════════
  PHASE 3: TENANT ISOLATION
═══════════════════════════════════════════════════════

─── PHASE 3: Tenant isolation ───
  ✅ PASS: Isolation: HTTP 404 for cross-tenant fetch (expected 404)
  ✅ PASS: No lifecycle data returned for cross-tenant request

═══════════════════════════════════════════════════════
  PHASE 4: STRESS TEST
═══════════════════════════════════════════════════════

📦 PHASE 4: Seeding stress test data...
  ✅ 100 proposals + 200 email logs inserted

─── PHASE 4: Stress test validation ───
  ✅ PASS: HTTP 200 (got 200)
  ⏱  Response time: 142ms
  ✅ PASS: Response under 3000ms (got 142ms)
  ✅ PASS: 100 proposals (got 100)
  📊 Progress: 73%
  📊 Timeline entries: ~301
  📊 Total steps: ~504
  ✅ PASS: No duplicate timeline entries in stress data
  ✅ PASS: Stress timeline sorted chronologically
  ✅ PASS: Has failed emails (got 20)

═══════════════════════════════════════════════════════
  PHASE 5: EDGE CASES
═══════════════════════════════════════════════════════

─── PHASE 5: Edge cases ───

  >> Edge 5a: Rejected event
  ✅ PASS: Rejected event: HTTP 200
  ✅ PASS: Rejected event: completedSteps >= 2 (got 2)
  ✅ PASS: Rejected event: timeline has EVENT_REJECTED
  ✅ PASS: Event status is REJECTED

  >> Edge 5b: Non-existent event
  ✅ PASS: Non-existent event: HTTP 404 (got 404)

  >> Edge 5c: Invalid UUID
  ✅ PASS: Invalid UUID: HTTP 400/422 (got 400)

  >> Edge 5d: Missing email logs (already covered by Case 1)
  ✅ PASS: Case 1 proves lifecycle works with zero email logs

  >> Edge 5e: Missing audit logs (already covered by Case 1)
  ✅ PASS: Case 1 proves lifecycle works with zero audit logs

🧹 Cleaning up test data...
  ✅ Cleanup complete

╔══════════════════════════════════════════════════════╗
║    FINAL REPORT                                     ║
╠══════════════════════════════════════════════════════╣
║  ✅ Passed: 42   ❌ Failed: 0                       ║
╚══════════════════════════════════════════════════════╝

🎉 ALL TESTS PASSED
```

---

## Pass/Fail Checklist

### Phase 1 — Core Cases

| # | Test | Expected | Pass Condition |
|---|------|----------|----------------|
| 1.1 | Case 1 HTTP status | 200 | `status === 200` |
| 1.2 | Case 1 totalSteps | 2 | `progress.totalSteps === 2` |
| 1.3 | Case 1 completedSteps | 1 | `progress.completedSteps === 1` |
| 1.4 | Case 1 percentage | 50% | `progress.percentage === 50` |
| 1.5 | Case 1 proposals | [] | `proposals.length === 0` |
| 1.6 | Case 1 timeline length | 1 | `timeline.length === 1` |
| 1.7 | Case 1 first entry type | EVENT_CREATED | `timeline[0].type === 'EVENT_CREATED'` |
| 1.8 | Case 1 no emails | 0 email entries | No EMAIL_SENT/EMAIL_FAILED in timeline |
| 2.1 | Case 2 HTTP status | 200 | `status === 200` |
| 2.2 | Case 2 totalSteps | 9 | `progress.totalSteps === 9` |
| 2.3 | Case 2 completedSteps | 8 | `progress.completedSteps === 8` |
| 2.4 | Case 2 percentage | 80-95% | `progress.percentage` in range |
| 2.5 | Case 2 proposals count | 2 | `proposals.length === 2` |
| 2.6 | Case 2 no failed emails | 0 | `EMAIL_FAILED count === 0` |
| 2.7 | Case 2 sent emails | ≥3 | `EMAIL_SENT count >= 3` |
| 2.8 | Case 2 timeline sorted | ascending | All timestamps non-decreasing |
| 2.9 | Case 2 has all types | ✓ | EVENT_CREATED, EVENT_VERIFIED, PROPOSAL_SUBMITTED, PROPOSAL_APPROVED, EMAIL_SENT all present |
| 3.1 | Case 3 HTTP status | 200 | `status === 200` |
| 3.2 | Case 3 totalSteps | 4 | `progress.totalSteps === 4` |
| 3.3 | Case 3 completedSteps | 3 | `progress.completedSteps === 3` |
| 3.4 | Case 3 percentage | 75% | `progress.percentage === 75` |
| 3.5 | Case 3 failed email present | ≥1 | `EMAIL_FAILED count >= 1` |
| 3.6 | Case 3 error visible | ✓ | Description includes 'SMTP error' |
| 3.7 | Case 3 sent email present | ≥1 | `EMAIL_SENT count >= 1` |
| 4.1 | Case 4 HTTP status | 200 | `status === 200` |
| 4.2 | Case 4 deduplication | 1 EMAIL_SENT for event | Deduped from 2 → 1 |
| 4.3 | Case 4 no duplicates | unique keys | `keys.length === uniqueKeys.size` |
| 4.4 | Case 4 sorted | ascending | All timestamps non-decreasing |

### Phase 3 — Tenant Isolation

| # | Test | Expected | Pass Condition |
|---|------|----------|----------------|
| 3.1 | Cross-tenant fetch | 404 | Tenant 1 JWT cannot see Tenant 2 event |
| 3.2 | No data leaked | null | Response body has no lifecycle data |

### Phase 4 — Stress Test

| # | Test | Expected | Pass Condition |
|---|------|----------|----------------|
| 4.1 | HTTP status | 200 | No crash |
| 4.2 | Response time | <3000ms | `elapsed < 3000` |
| 4.3 | Proposals count | 100 | `proposals.length === 100` |
| 4.4 | No duplicates | unique | `keys.length === uniqueKeys.size` |
| 4.5 | Sorted | ascending | All timestamps non-decreasing |
| 4.6 | Has failed emails | ≥1 | 10% failure rate in seed |

### Phase 5 — Edge Cases

| # | Test | Expected | Pass Condition |
|---|------|----------|----------------|
| 5.1 | Rejected event | 200 | Lifecycle renders correctly |
| 5.2 | Rejected progress | ≥2 completed | REJECTED counts as verification complete |
| 5.3 | EVENT_REJECTED in timeline | ✓ | Timeline has type EVENT_REJECTED |
| 5.4 | Non-existent event | 404 | `status === 404` |
| 5.5 | Invalid UUID | 400 or 422 | ParseUUIDPipe rejects |
| 5.6 | Zero email logs | ✓ | Case 1 proves no crash |
| 5.7 | Zero audit logs | ✓ | Case 1 proves no crash |

---

## Performance Optimization Suggestions

1. **Add composite index** on `email_logs(tenant_id, entity_type, entity_id)` — the lifecycle query
   filters by all three columns. Current indexes cover `tenant_id` and `job_name` separately.

2. **Add composite index** on `audit_logs(tenant_id, entity_type, entity_id)` — same reason.
   Current index covers `entity_type, entity_id` but not tenant-scoped.

3. **Consider LIMIT on email_logs** — for events with thousands of emails, consider pagination
   or capping the timeline to the most recent N entries.

4. **Use `Promise.all`** for the 4 parallel Prisma queries (event + sponsorships + auditLogs + emailLogs)
   instead of sequential execution. Currently the service issues them sequentially.

5. **Cache hot lifecycle responses** — For events that don't change frequently, use the existing
   CacheModule (Redis) with a short TTL (30-60s) to avoid repeated DB round-trips.

6. **Materialized timeline view** — For very large events (1000+ proposals), consider a materialized
   view or denormalized table that pre-aggregates timeline entries on write.
