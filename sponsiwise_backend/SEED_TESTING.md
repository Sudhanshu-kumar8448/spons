# SponsiWise Seed Data Testing Guide

## Overview

This document describes how to test all the seeded data and edge cases in your SponsiWise application after running the seed script.

---

## Quick Start

### 1. Run the Seed Script

```bash
cd sponsiwise_backend
DATABASE_URL='postgresql://postgres:newpassword123@localhost:5432/postgres' npx ts-node prisma/seed.ts
```

### 2. Run Tests

```bash
# Run all seed tests
npm test -- test/seed.spec.ts

# Or run with verbose output
npm test -- test/seed.spec.ts --verbose
```

---

## Login Credentials

All users have the same password: **`password123`**

### Test Accounts

| Email | Role | Description |
|-------|------|-------------|
| `admin@spons.com` | ADMIN | Full system access |
| `user1@spons.com` - `user5@spons.com` | USER | Regular users |
| `manager1@spons.com` - `manager3@spons.com` | MANAGER | Manager role users |
| `organizer1@spons.com` - `organizer5@spons.com` | ORGANIZER | Event organizers |
| `sponsor1@spons.com` - `sponsor5@spons.com` | SPONSOR | Sponsorship companies |

---

## Seeded Data Summary

### Users: 19 total
- 1 Admin
- 5 Regular Users
- 3 Managers
- 5 Organizers
- 5 Sponsors

### Companies: 10 total
- 5 Sponsor companies (type: SPONSOR)
- 5 Organizer companies (type: ORGANIZER)

### Events: 15 total (3 per organizer)
- **PUBLISHED**: 5 events (confirmed)
- **PENDING**: 5 events (awaiting verification)
- **DRAFT**: 5 events (not yet published)

### Sponsorships: 18
- Statuses: PENDING, ACTIVE, PAUSED, COMPLETED
- Various tiers: Platinum, Gold, Silver, Bronze

### Proposals: 18
All proposal statuses covered:
- DRAFT
- SUBMITTED
- UNDER_REVIEW
- APPROVED
- REJECTED
- WITHDRAWN

### Refresh Tokens: 76 (4 per user)
Each user has 4 tokens for testing edge cases:
- **Active tokens** (isRevoked: false) - Valid session
- **Revoked tokens** (isRevoked: true) - Manually revoked
- **Expired tokens** (expiresAt < now) - Time-based expiration
- **Rotated tokens** (rotatedAt set) - Token rotation

### Notifications: 20
All severity types:
- INFO
- SUCCESS
- WARNING
- ERROR

### Email Logs: 20
Various email types:
- welcome_email
- password_reset
- proposal_submitted
- proposal_approved
- proposal_rejected
- event_confirmation
- event_reminder
- sponsorship_confirmation
- And more...

### Audit Logs: 20
Various actions:
- user.created
- user.login
- user.logout
- password.changed
- company.created
- company.verified
- event.created
- event.published
- proposal.created
- proposal.approved
- proposal.rejected
- And more...

---

## How to Test Each Feature

### 1. Authentication Tests

#### Login with Different Roles
```bash
# Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@spons.com", "password": "password123"}'

# Login as organizer
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "organizer1@spons.com", "password": "password123"}'

# Login as sponsor
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sponsor1@spons.com", "password": "password123"}'
```

#### Test Refresh Token Edge Cases

**Test 1: Valid Refresh Token**
```bash
# Use an active token from the database
# Should return new access token
```

**Test 2: Revoked Token**
```bash
# Use a revoked token from the database
# Should fail with "Refresh token reuse detected"
```

**Test 3: Expired Token**
```bash
# Use an expired token from the database
# Should fail with "Refresh token expired"
```

**Test 4: Rotated Token**
```bash
# Use a rotated token from the database
# Should fail with appropriate error
```

---

### 2. Event Tests

#### Get Events by Status

```bash
# Get all published events
curl http://localhost:3000/events?status=PUBLISHED

# Get all draft events
curl http://localhost:3000/events?status=DRAFT

# Get events by organizer
curl http://localhost:3000/organizers/{organizerId}/events
```

#### Test Event Status Transitions
- Draft → Published
- Published → Cancelled
- Published → Completed

---

### 3. Proposal Tests

#### Get Proposals by Status

```bash
# Get all draft proposals
curl http://localhost:3000/proposals?status=DRAFT

# Get all approved proposals
curl http://localhost:3000/proposals?status=APPROVED

# Get all rejected proposals
curl http://localhost:3000/proposals?status=REJECTED

# Get proposals under review
curl http://localhost:3000/proposals?status=UNDER_REVIEW
```

#### Test Proposal Workflow
1. Create draft proposal
2. Submit proposal (SUBMITTED)
3. Under review (UNDER_REVIEW)
4. Approve/Reject (APPROVED/REJECTED)
5. Withdraw (WITHDRAWN)

---

### 4. Sponsorship Tests

#### Get Sponsorships by Status

```bash
# Get all pending sponsorships
curl http://localhost:3000/sponsorships?status=PENDING

# Get all active sponsorships
curl http://localhost:3000/sponsorships?status=ACTIVE

# Get all completed sponsorships
curl http://localhost:3000/sponsorships?status=COMPLETED
```

---

### 5. Notification Tests

#### Get Notifications

```bash
# Get all notifications for current user
curl http://localhost:3000/notifications

# Get unread notifications only
curl http://localhost:3000/notifications?read=false
```

#### Test Notification Types
- **Proposal Accepted**: Check notification for sponsor
- **Proposal Rejected**: Check notification for sponsor
- **Event Confirmed**: Check notification for organizer
- **New Proposal**: Check notification for organizer

---

### 6. Email Log Tests

```bash
# Get all sent emails
curl http://localhost:3000/email-logs?status=SENT

# Get all failed emails
curl http://localhost:3000/email-logs?status=FAILED

# Get specific email type
curl http://localhost:3000/email-logs?jobName=welcome_email
```

---

### 7. Audit Log Tests

```bash
# Get all audit logs
curl http://localhost:3000/audit-logs

# Get logs by action
curl http://localhost:3000/audit-logs?action=user.login

# Get logs by entity type
curl http://localhost:3000/audit-logs?entityType=Proposal

# Get logs by actor
curl http://localhost:3000/audit-logs?actorId={userId}
```

---

### 8. Company Verification Tests

```bash
# Get verified companies
curl http://localhost:3000/companies?verificationStatus=VERIFIED

# Get pending companies
curl http://localhost:3000/companies?verificationStatus=PENDING

# Get rejected companies
curl http://localhost:3000/companies?verificationStatus=REJECTED
```

---

### 9. Role-Based Access Control Tests

#### Test each role's permissions:

```bash
# Admin can access everything
# Login as admin and test admin endpoints

# Manager can manage events and proposals
# Login as manager1@spons.com

# Organizer can manage their own events
# Login as organizer1@spons.com

# Sponsor can submit proposals
# Login as sponsor1@spons.com

# Regular user has limited access
# Login as user1@spons.com
```

---

## Database Query Examples

### View All Users
```sql
SELECT id, email, role, "isActive" FROM users;
```

### View Events Per Organizer
```sql
SELECT o.name as organizer, e.title, e.status, e."verificationStatus"
FROM events e
JOIN organizers o ON e."organizerId" = o.id
ORDER BY o.name, e.status;
```

### View Proposal Status Distribution
```sql
SELECT status, COUNT(*) as count FROM proposals GROUP BY status;
```

### View Refresh Token Status
```sql
SELECT 
  "isRevoked", 
  CASE WHEN "expiresAt" < NOW() THEN 'expired' ELSE 'valid' END as expiry_status,
  COUNT(*) as count 
FROM "refreshTokens" 
GROUP BY "isRevoked", expiry_status;
```

### View All Notifications for a User
```sql
SELECT n.title, n.severity, n.read, n."createdAt"
FROM notifications n
JOIN users u ON n."userId" = u.id
WHERE u.email = 'sponsor1@spons.com'
ORDER BY n."createdAt" DESC;
```

---

## Testing Checklist

- [ ] Login works for all user types
- [ ] Password `password123` works for all users
- [ ] All users belong to global tenant
- [ ] Events show correct status distribution
- [ ] Proposals cover all 6 statuses
- [ ] Sponsorships have various statuses
- [ ] Refresh tokens cover all edge cases
- [ ] Notifications cover all severity types
- [ ] Email logs show sent and failed emails
- [ ] Audit logs capture all actions
- [ ] Role-based access control works
- [ ] Company verification workflow works

---

## Troubleshooting

### Seed Not Running
```bash
# Make sure DATABASE_URL is set
export DATABASE_URL='postgresql://postgres:newpassword123@localhost:5432/postgres'
npx ts-node prisma/seed.ts
```

### Tests Failing
```bash
# Make sure database is running
pg_isready -h localhost -p 5432

# Make sure backend is running (for integration tests)
npm run start:dev
```

### Clear and Reseed
```bash
# Run seed again - it will clean existing data first
npx ts-node prisma/seed.ts
```

---

## Files Created

- `prisma/seed.ts` - Main seed script
- `test/seed.spec.ts` - Test suite for verification
- `SEED_TESTING.md` - This documentation

---

## Support

For any issues or questions, check:
1. Database connection is working
2. All migrations have been applied
3. Environment variables are set correctly

