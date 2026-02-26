# SponsiWise Manager Module Documentation

This document provides a comprehensive overview of the Manager module in SponsiWise, covering backend services, frontend integration, notifications, emails, and the verification workflow.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Components](#backend-components)
   - [Manager Dashboard Service](#manager-dashboard-service)
   - [Manager Dashboard Controller](#manager-dashboard-controller)
   - [Manager Lifecycle Service](#manager-lifecycle-service)
   - [Manager Lifecycle Controller](#manager-lifecycle-controller)
3. [Frontend Components](#frontend-components)
4. [API Endpoints](#api-endpoints)
5. [Verification Workflow](#verification-workflow)
6. [Email & Notification System](#email--notification-system)
7. [Event Flow & Domain Events](#event-flow--domain-events)
8. [Data Models](#data-models)

---

## Architecture Overview

The Manager module is responsible for:
- **Verification of Companies and Events** created by organizers
- **Dashboard statistics** for the manager
- **Activity monitoring** through audit logs
- **Lifecycle tracking** of events and proposals
- **Notifications** to users about verification outcomes

### Key Concepts

- **Tenant Isolation**: All operations are scoped to a tenant (after soft-disable multi-tenancy, uses `GLOBAL_TENANT_ID`)
- **Role-Based Access**: Only users with `MANAGER` role can access these endpoints
- **Domain Events**: Verification actions emit events that trigger emails and notifications

---

## Backend Components

### Manager Dashboard Service

**File**: `src/manager-dashboard/manager-dashboard.service.ts`

The ManagerDashboardService provides verification and dashboard functionality:

#### Key Methods:

1. **`getDashboardStats(tenantId: string)`**
   - Returns verification queue counts and platform stats
   - Counts: companies_pending, companies_verified, events_pending, events_verified, total_users, recent_registrations

2. **`getCompanies(tenantId, query)`**
   - Returns paginated list of companies
   - Filters by verification_status (PENDING, VERIFIED, REJECTED)
   - Supports search by name/slug

3. **`getCompanyById(tenantId, companyId)`**
   - Returns single company details with owner info

4. **`verifyCompany(tenantId, companyId, dto, reviewerId, reviewerRole)`**
   - Updates company verification status
   - Emits `COMPANY_VERIFIED_EVENT` or `COMPANY_REJECTED_EVENT`
   - **Important**: Upgrades company owner's role from USER → SPONSOR on verification

5. **`getEvents(tenantId, query)`**
   - Returns paginated events pending verification
   - Default filter: verificationStatus = PENDING

6. **`getEventById(tenantId, eventId)`**
   - Returns single event details with organizer info

7. **`verifyEvent(tenantId, eventId, dto, reviewerId, reviewerRole)`**
   - Updates event verification status
   - Emits `EVENT_VERIFIED_EVENT` or `EVENT_REJECTED_EVENT`

8. **`getActivity(tenantId, query)`**
   - Returns paginated audit log entries
   - Read-only access to all tenant activity

### Manager Dashboard Controller

**File**: `src/manager-dashboard/manager-dashboard.controller.ts`

```typescript
@Controller('manager')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER)
```

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/manager/dashboard/stats` | Get dashboard statistics |
| GET | `/manager/companies` | List companies (with filters) |
| GET | `/manager/companies/:id` | Get company details |
| POST | `/manager/companies/:id/verify` | Verify/reject company |
| GET | `/manager/events` | List events (with filters) |
| GET | `/manager/events/:id` | Get event details |
| POST | `/manager/events/:id/verify` | Verify/reject event |
| GET | `/manager/activity` | Get audit logs |

### Manager Lifecycle Service

**File**: `src/manager-lifecycle/manager-lifecycle.service.ts`

Provides a comprehensive lifecycle view of an event, aggregating:
- Event metadata with organizer info
- All proposals under the event
- Audit logs for event and proposal actions
- Email logs for tracking communications
- Progress calculation based on lifecycle steps

#### Key Method:

**`getEventLifecycle(tenantId, eventId)`**
Returns `EventLifecycleResponse`:
```typescript
{
  event: { /* Event metadata */ },
  proposals: [ /* All proposals */ ],
  progress: { totalSteps, completedSteps, percentage },
  timeline: [ /* Chronological events */ ]
}
```

#### Timeline Entry Types:
- `EVENT_CREATED` - Event was created
- `EVENT_VERIFIED` - Event was verified
- `EVENT_REJECTED` - Event was rejected
- `PROPOSAL_SUBMITTED` - Proposal was submitted
- `PROPOSAL_APPROVED` - Proposal was approved
- `PROPOSAL_REJECTED` - Proposal was rejected
- `PROPOSAL_STATUS_CHANGED` - Proposal status changed
- `EMAIL_SENT` - Email was sent successfully
- `EMAIL_FAILED` - Email failed to send
- `AUDIT_LOG` - General audit log entry

#### Progress Calculation:
- Event created (always 1 completed)
- Event verification (completed if verified/rejected)
- Per proposal: submission (completed if submitted)
- Per proposal: decision (completed if approved/rejected)
- Per email: sent (completed only if SENT, not FAILED)

### Manager Lifecycle Controller

**File**: `src/manager-lifecycle/manager-lifecycle.controller.ts`

```typescript
@Controller('manager/events')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.MANAGER)
```

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/manager/events/:id/lifecycle` | Get full event lifecycle |

---

## Frontend Components

### Manager API Client

**File**: `src/lib/manager-api.ts`

Functions available:
```typescript
// Dashboard
fetchManagerDashboardStats()

// Companies
fetchVerifiableCompanies(params)
fetchVerifiableCompanyById(id)
verifyCompany(id, payload)

// Events
fetchVerifiableEvents(params)
fetchVerifiableEventById(id)
verifyEvent(id, payload)

// Activity
fetchActivityLog(params)

// Lifecycle
fetchEventLifecycle(id)
fetchCompanyLifecycleView(id)
```

### Frontend Types

**File**: `src/lib/types/manager.ts`

Key interfaces:
```typescript
interface ManagerDashboardStats {
  companies_pending: number;
  companies_verified: number;
  events_pending: number;
  number;
  total events_verified:_users: number;
  recent_registrations: number;
}

interface VerifiableCompany {
  id: string;
  name: string;
  slug: string;
  verification_status: string;
  // ... more fields
}

interface EventLifecycleResponse {
  event: Event;
  proposals: Proposal[];
  progress: LifecycleProgress;
  timeline: TimelineEntry[];
}
```

---

## API Endpoints

### Authentication & Authorization

All manager endpoints require:
1. **Authentication**: Valid JWT token (AuthGuard)
2. **Authorization**: MANAGER role (RoleGuard + @Roles)
3. **Tenant Scope**: tenant_id from JWT

### Request/Response Flow

```
Frontend (Next.js)
    │
    │ fetchVerifiableCompanies()
    ▼
authFetch() → Adds JWT token
    │
    ▼
NestJS Controller (ManagerDashboardController)
    │
    │ @UseGuards(AuthGuard, RoleGuard)
    │ @Roles(Role.MANAGER)
    ▼
ManagerDashboardService
    │
    │ getCompanies(user.tenant_id, query)
    ▼
Prisma Service → Database
    │
    ▼
Response to Frontend
```

---

## Verification Workflow

### Company Verification Flow

```
1. Organizer creates a Company
   └── Company created with verificationStatus = PENDING

2. Manager views pending companies
   └── GET /manager/companies?verification_status=pending

3. Manager reviews company details
   └── GET /manager/companies/:id

4. Manager verifies or rejects
   └── POST /manager/companies/:id/verify
       ├── Body: { action: "verify", notes: "..." }
       └── OR: { action: "reject", notes: "..." }

5. On verify:
   ├── Company.verificationStatus → VERIFIED
   ├── User.role (company owner) → SPONSOR
   ├── Emit COMPANY_VERIFIED_EVENT
   ├── NotificationProcessor creates notification
   ├── Email sent to company owner
   └── Audit log entry created

6. On reject:
   ├── Company.verificationStatus → REJECTED
   ├── Emit COMPANY_REJECTED_EVENT
   ├── NotificationProcessor creates notification
   ├── Email sent to company owner
   └── Audit log entry created
```

### Event Verification Flow

```
1. Organizer creates an Event
   └── Event created with verificationStatus = PENDING
   └── Event status = DRAFT

2. Manager views pending events
   └── GET /manager/events (default: PENDING)

3. Manager reviews event details
   └── GET /manager/events/:id

4. Manager verifies or rejects
   └── POST /manager/events/:id/verify
       ├── Body: { action: "verify", notes: "..." }
       └── OR: { action: "reject", notes: "..." }

5. On verify:
   ├── Event.verificationStatus → VERIFIED
   ├── Emit EVENT_VERIFIED_EVENT
   ├── NotificationProcessor creates notification
   ├── Email sent to organizer
   └── Audit log entry created

6. On reject:
   ├── Event.verificationStatus → REJECTED
   ├── Emit EVENT_REJECTED_EVENT
   ├── NotificationProcessor creates notification
   ├── Email sent to organizer
   └── Audit log entry created
```

---

## Email & Notification System

### Domain Events

Located in `src/common/events/`:

| Event | Trigger | Data |
|-------|---------|------|
| `COMPANY_VERIFIED_EVENT` | Company verified | entityId, tenantId, reviewerId, reviewerRole, reviewerNotes |
| `COMPANY_REJECTED_EVENT` | Company rejected | entityId, tenantId, reviewerId, reviewerRole, reviewerNotes |
| `EVENT_VERIFIED_EVENT` | Event verified | entityId, tenantId, reviewerId, reviewerRole, reviewerNotes |
| `EVENT_REJECTED_EVENT` | Event rejected | entityId, tenantId, reviewerId, reviewerRole, reviewerNotes |

### Notification Service

**File**: `src/notifications/notifications.service.ts`

Provides CRUD operations for in-app notifications:

```typescript
// Create notification (called by NotificationProcessor)
create(input: CreateNotificationInput)

// Get all notifications for user
findAll(userId, tenantId, { page, pageSize, read })

// Get single notification
findById(id, userId, tenantId)

// Mark as read
markAsRead(id, userId, tenantId)

// Mark all as read
markAllAsRead(userId, tenantId)
```

### Email Handling

- **Email Logs**: Stored in database via `EmailLog` model
- **Tracking**: Email status (SENT/FAILED) tracked in lifecycle view
- **Failure Handling**: Failed emails show in timeline with error details

---

## Data Models

### Key Prisma Models

```prisma
model Company {
  id                String             @id @default(uuid())
  tenantId          String
  name              String
  slug              String?
  type              String?
  verificationStatus VerificationStatus @default(PENDING)
  users             User[]
  sponsorships      Sponsorship[]
  // ...
}

model Event {
  id                String             @id @default(uuid())
  tenantId          String
  title             String
  organizerId       String
  verificationStatus VerificationStatus @default(PENDING)
  status            EventStatus        @default(DRAFT)
  organizer         Organizer
  sponsorships      Sponsorship[]
  // ...
}

model Notification {
  id          String             @id @default(uuid())
  tenantId    String
  userId      String
  title       String
  message     String
  severity    NotificationSeverity @default(INFO)
  read        Boolean            @default(false)
  link        String?
  entityType  String?
  entityId    String?
  // ...
}

model AuditLog {
  id          String   @id @default(uuid())
  tenantId    String
  actorId     String
  actorRole   String
  action      String
  entityType  String
  entityId    String
  metadata    Json?
  // ...
}

model EmailLog {
  id            String   @id @default(uuid())
  tenantId      String
  recipient     String
  subject       String
  status        String   // SENT, FAILED
  errorMessage  String?
  entityType    String?
  entityId      String?
  // ...
}
```

### Enums

```prisma
enum VerificationStatus {
  PENDING
  VERIFIED
  REJECTED
}

enum EventStatus {
  DRAFT
  PUBLISHED
  CANCELLED
  COMPLETED
}

enum NotificationSeverity {
  INFO
  SUCCESS
  WARNING
  ERROR
}
```

---

## Frontend-Backend Communication

### Authentication Flow

```
1. User logs in → Gets JWT token (access_token + refresh_token)
2. Frontend stores tokens in cookies
3. Each API request includes JWT via Authorization header
4. Backend validates JWT and extracts user info
```

### API Request Example

```typescript
// Frontend
import { fetchVerifiableCompanies } from '@/lib/manager-api';

const companies = await fetchVerifiableCompanies({
  page: 1,
  page_size: 10,
  verification_status: 'pending'
});

// authFetch adds the JWT automatically
```

### Error Handling

- 401: Invalid/missing token → Redirect to login
- 403: Insufficient permissions → Show access denied
- 404: Entity not found → Show not found page
- 400: Bad request → Show validation errors

---

## Summary

The Manager module in SponsiWise provides a comprehensive system for:

1. **Verification Workflow**: Managers can verify/reject companies and events
2. **Dashboard Analytics**: View statistics about platform activity
3. **Lifecycle Tracking**: Full visibility into event and proposal history
4. **Notifications**: In-app alerts for verification outcomes
5. **Audit Trail**: Complete audit logs for compliance

The system uses domain events to decouple verification actions from notifications/emails, allowing for asynchronous processing and easy extension.

