# SponsiWise Manager API Documentation

## Overview

This document provides a complete reference for all Manager API endpoints in the SponsiWise platform. The Manager role has access to manage companies, events, proposals, tiers, and view activity logs and lifecycles.

**Base URL:** `/api` (via Next.js API routes proxying to NestJS backend)

**Authentication:** JWT Bearer Token required for all endpoints.

**Authorization:** Requires `MANAGER` role.

**Tenant Scoping:** All data is automatically scoped to the manager's tenant from the JWT token.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Dashboard Stats](#1-dashboard-stats)
3. [Companies Management](#2-companies-management)
4. [Events Management](#3-events-management)
5. [Sponsorship Tiers](#4-sponsorship-tiers)
6. [Proposals Management](#5-proposals-management)
7. [Activity Log](#6-activity-log)
8. [Event Lifecycle](#7-event-lifecycle)
9. [Company Lifecycle](#8-company-lifecycle)
10. [Common Types](#common-types)

---

## Authentication & Authorization

All Manager endpoints require:

1. **AuthGuard** - Valid JWT token
2. **RoleGuard** - User must have `MANAGER` role
3. **Tenant Scoping** - Automatically derived from JWT `tenant_id` claim

### JWT Payload Structure

```typescript
interface JwtPayloadWithClaims {
  sub: string;          // User ID
  tenant_id: string;   // Tenant ID (scopes all data)
  role: string;         // User role (MANAGER, ORGANIZER, SPONSOR, ADMIN)
  email?: string;
  iat?: number;
  exp?: number;
}
```

---

## 1. Dashboard Stats

### GET /manager/dashboard/stats

Retrieves verification queue counts and basic platform statistics for the manager's tenant.

**Endpoint:** `GET /api/manager/dashboard/stats`

**Authorization:** MANAGER role required

**Response:**

```typescript
interface ManagerDashboardStats {
  companies_pending: number;      // Companies awaiting verification
  companies_verified: number;     // Verified companies count
  events_pending: number;         // Events awaiting verification
  events_verified: number;        // Verified events count
  total_users: number;            // Total active users in tenant
  recent_registrations: number;   // Users registered in last 7 days
}
```

**Example Response:**

```json
{
  "companies_pending": 5,
  "companies_verified": 23,
  "events_pending": 2,
  "events_verified": 15,
  "total_users": 156,
  "recent_registrations": 12
}
```

**Frontend API Call:**

```typescript
import { fetchManagerDashboardStats } from '@/lib/manager-api';

const stats = await fetchManagerDashboardStats();
```

---

## 2. Companies Management

### GET /manager/companies

Retrieves a paginated list of companies in the manager's tenant.

**Endpoint:** `GET /api/manager/companies`

**Authorization:** MANAGER role required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| page_size | number | No | Items per page (default: 12, max: 50) |
| verification_status | string | No | Filter by status: `PENDING`, `VERIFIED`, `REJECTED` |
| search | string | No | Search by company name or slug |

**Response:**

```typescript
interface VerifiableCompaniesResponse {
  data: VerifiableCompany[];
  total: number;
  page: number;
  page_size: number;
}

interface VerifiableCompany {
  id: string;
  name: string;
  slug: string | null;
  type: string;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  verification_status: string;
  isActive: boolean;
  created_at: string;
  updated_at: string;
  owner: {
    id: string;
    email: string;
    name: string;
  };
}
```

**Frontend API Call:**

```typescript
import { fetchVerifiableCompanies } from '@/lib/manager-api';

const companies = await fetchVerifiableCompanies({
  page: 1,
  page_size: 12,
  verification_status: 'PENDING',
  search: 'acme'
});
```

---

### GET /manager/companies/:id

Retrieves detailed information about a specific company.

**Endpoint:** `GET /api/manager/companies/:id`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Company ID |

**Response:** Returns `VerifiableCompany` object with full details.

**Frontend API Call:**

```typescript
import { fetchVerifiableCompanyById } from '@/lib/manager-api';

const company = await fetchVerifiableCompanyById('company-uuid-here');
```

---

### POST /manager/companies/:id/verify

Verifies or rejects a company.

**Endpoint:** `POST /api/manager/companies/:id/verify`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Company ID |

**Request Body:**

```typescript
interface VerifyEntityDto {
  action: 'verify' | 'reject';  // Required - action to perform
  notes?: string;               // Optional - notes for the action
}
```

**Business Logic:**
- Only companies with `PENDING` verification status can be verified/rejected
- When verified, the company's owner user role is upgraded from `USER` to `SPONSOR`
- Emits domain events: `COMPANY_VERIFIED_EVENT` or `COMPANY_REJECTED_EVENT`
- Creates audit log entry

**Response:**

```typescript
{
  id: string;
  name: string;
  verification_status: 'verified' | 'rejected';
  updated_at: string;
}
```

**Example Request:**

```json
{
  "action": "verify",
  "notes": "Company documents verified, logo looks professional"
}
```

**Frontend API Call:**

```typescript
import { verifyCompany } from '@/lib/manager-api';

const result = await verifyCompany('company-uuid-here', {
  action: 'verify',
  notes: 'All documents verified'
});
```

---

## 3. Events Management

### GET /manager/events

Retrieves a paginated list of events in the manager's tenant.

**Endpoint:** `GET /api/manager/events`

**Authorization:** MANAGER role required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| page_size | number | No | Items per page (default: 12, max: 50) |
| verification_status | string | No | Filter by status: `PENDING`, `VERIFIED`, `REJECTED` |
| search | string | No | Search by event title or description |

**Response:**

```typescript
interface VerifiableEventsResponse {
  data: VerifiableEvent[];
  total: number;
  page: number;
  page_size: number;
}

interface VerifiableEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  start_date: string;          // ISO 8601 datetime
  end_date: string;            // ISO 8601 datetime
  location: string;   // yaha correction hai yaha location ke jagah addresss hoga
  venue: string;
  image_url: string | null;
  category: string;
  status: string;
  verification_status: string;
  expected_footfall: number;
  organizer: {
    id: string;
    name: string;
    email: string;
    logo_url: string | null;
  };
  tags: string[];
  sponsorship_tiers_summary: {
    total_tiers: number;
    total_slots: number;
    sold_slots: number;
    available_slots: number;
    has_available_tiers: boolean;
  };
  created_at: string;
  updated_at: string;
}
```

**Frontend API Call:**

```typescript
import { fetchVerifiableEvents } from '@/lib/manager-api';

const events = await fetchVerifiableEvents({
  page: 1,
  page_size: 12,
  verification_status: 'PENDING'
});
```

---

### GET /manager/events/:id

Retrieves detailed information about a specific event including all sponsorship tiers.

**Endpoint:** `GET /api/manager/events/:id`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Event ID |

**Response:**

```typescript
interface ManagerEventDetail extends VerifiableEvent {
  contact_phone: string | null;
  contact_email: string | null;
  ppt_deck_url: string | null;
  address: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  } | null;
  sponsorship_tiers: SponsorshipTier[];
}

interface SponsorshipTier {
  id: string;
  tier_type: 'TITLE' | 'PLATINUM' | 'PRESENTING' | 'POWERED_BY' | 'GOLD' | 'SILVER' | 'CUSTOM';
  asking_price: number;
  total_slots: number;
  sold_slots: number;
  available_slots: number;
  is_locked: boolean;
  is_active: boolean;
  is_available: boolean;
}
```

**Frontend API Call:**

```typescript
import { fetchVerifiableEventById } from '@/lib/manager-api';

const event = await fetchVerifiableEventById('event-uuid-here');
```

---

### PATCH /manager/events/:id

Updates an event's information, address, and tiers.

**Endpoint:** `PATCH /api/manager/events/:id`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Event ID |

**Request Body:**

```typescript
interface UpdateManagerEventDto {
  // Basic Info
  title?: string;
  description?: string;
  startDate?: string;          // ISO 8601 datetime
  endDate?: string;            // ISO 8601 datetime
  
  // Details
  expectedFootfall?: number;
  website?: string;            // URL
  logoUrl?: string;            // URL
  category?: string;
  contactPhone?: string;
  contactEmail?: string;
  pptDeckUrl?: string;         // URL to presentation deck
  
  // Status
  status?: 'DRAFT' | 'UNDER_MANAGER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  
  // Address
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  
  // Tiers - include all tiers to update, or add new ones
  tiers?: Array<{
    id?: string;               // Existing tier ID to update
    tierType?: string;
    customName?: string;
    askingPrice?: number;
    totalSlots?: number;
    benefits?: string[];
    isLocked?: boolean;
  }>;
}
```

**Business Logic:**
- Validates that `endDate` is after `startDate`
- Updates address if provided
- Tier updates:
  - Existing tiers (by ID) are updated
  - New tiers (no ID) are created
  - Tiers not included in payload are soft-deleted (isActive = false)
- Creates audit log entry

**Validation Rules:**
- `title`: max 255 characters
- `website`, `logoUrl`, `pptDeckUrl`: must be valid URLs, max 500 characters
- `expectedFootfall`: must be non-negative integer
- `totalSlots`: must be between 1 and 100

**Response:** Returns fully hydrated `ManagerEventDetail` object.

**Frontend API Call:**

```typescript
import { updateEvent } from '@/lib/manager-api';

const updatedEvent = await updateEvent('event-uuid-here', {
  title: 'Updated Event Title',
  description: 'New description',
  status: 'PUBLISHED',
  address: {
    city: 'New York',
    state: 'NY',
    country: 'USA'
  }
});
```

---

### POST /manager/events/:id/verify

Verifies or rejects an event.

**Endpoint:** `POST /api/manager/events/:id/verify`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Event ID |

**Request Body:**

```typescript
interface VerifyEntityDto {
  action: 'verify' | 'reject';  // Required
  notes?: string;               // Optional notes
}
```

**Business Logic:**
- Only events with `PENDING` verification status can be verified/rejected
- When verified:
  - Event status changes to `VERIFIED`
  - All sponsorship tiers are locked (`isLocked = true`)
- Emits domain events: `EVENT_VERIFIED_EVENT` or `EVENT_REJECTED_EVENT`
- Creates audit log entries for both event verification and tier locking

**Response:**

```typescript
{
  id: string;
  title: string;
  verification_status: 'verified' | 'rejected';
  status: string;
  updated_at: string;
}
```

**Frontend API Call:**

```typescript
import { verifyEvent } from '@/lib/manager-api';

const result = await verifyEvent('event-uuid-here', {
  action: 'verify',
  notes: 'Event meets all requirements'
});
```

---

## 4. Sponsorship Tiers // kyu exit karta hai 

### POST /manager/events/:eventId/tiers

Creates a new sponsorship tier for an event.

**Endpoint:** `POST /api/manager/events/:eventId/tiers`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | string (UUID) | Yes | Event ID |

**Request Body:**

```typescript
interface CreateEventTierDto {
  tierType: 'TITLE' | 'PLATINUM' | 'PRESENTING' | 'POWERED_BY' | 'GOLD' | 'SILVER';  // Required
  askingPrice: number;         // Required - price in main currency unit
  totalSlots?: number;          // Optional - default: 1
}
```

**Validation:**
- `tierType`: Must be one of the specified enum values
- `askingPrice`: Must be non-negative number
- `totalSlots`: Must be at least 1, maximum 100

**Business Logic:**
- Cannot create duplicate tier type for the same event (except CUSTOM type)
- New tiers are created with `isLocked = false` and `soldSlots = 0`
- Creates audit log entry

**Response:**

```typescript
{
  id: string;
  tier_type: string;
  asking_price: number;
  total_slots: number;
  sold_slots: number;
  available_slots: number;
  is_locked: boolean;
}
```

**Frontend API Call:**

```typescript
import { createEventTier } from '@/lib/manager-api';

const tier = await createEventTier('event-uuid-here', {
  tierType: 'GOLD',
  askingPrice: 5000,
  totalSlots: 5
});
```

---

### PUT /manager/events/:eventId/tiers/:tierId

Updates an existing sponsorship tier.

**Endpoint:** `PUT /api/manager/events/:eventId/tiers/:tierId`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| eventId | string (UUID) | Yes | Event ID |
| tierId | string (UUID) | Yes | Tier ID |

**Request Body:**

```typescript
interface UpdateEventTierDto {
  askingPrice?: number;         // New price
  totalSlots?: number;          // New total slots
  isLocked?: boolean;           // Lock/unlock tier
}
```

**Validation:**
- Cannot reduce `totalSlots` below already sold slots

**Business Logic:**
- Managers can update tiers even if they are locked
- Creates audit log entry with previous values

**Response:** Returns updated tier object.

**Frontend API Call:**

```typescript
import { updateEventTier } from '@/lib/manager-api';

const tier = await updateEventTier('event-uuid-here', 'tier-uuid-here', {
  askingPrice: 7500,
  isLocked: true
});
```

---

## 5. Proposals Management

### GET /manager/proposals

Retrieves a paginated list of proposals in the manager's tenant.

**Endpoint:** `GET /api/manager/proposals`

**Authorization:** MANAGER role required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| page_size | number | No | Items per page (default: 12, max: 50) |
| status | string | No | Filter by proposal status |
| search | string | No | Search by company name |

**Proposal Status Values:**
- `DRAFT`
- `SUBMITTED`
- `UNDER_MANAGER_REVIEW`
- `FORWARDED_TO_ORGANIZER`
- `APPROVED`
- `REJECTED`
- `REQUEST_CHANGES`
- `WITHDRAWN`

**Response:**

```typescript
{
  data: Proposal[];
  total: number;
  page: number;
  page_size: number;
}
```

**Frontend API Call:**

```typescript
import { fetchManagerProposals } from '@/lib/manager-api';

const proposals = await fetchManagerProposals({
  page: 1,
  page_size: 12,
  status: 'UNDER_MANAGER_REVIEW'
});
```

---

### GET /manager/proposals/:id

Retrieves detailed information about a specific proposal.

**Endpoint:** `GET /api/manager/proposals/:id`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Proposal ID |

**Response:** Full proposal details including sponsorship and event information.

**Frontend API Call:**

```typescript
import { fetchManagerProposalById } from '@/lib/manager-api';

const proposal = await fetchManagerProposalById('proposal-uuid-here');
```

---

### PATCH /manager/proposals/:id

Updates a proposal's status, proposed amount, tier, or adds notes.

**Endpoint:** `PATCH /api/manager/proposals/:id`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Proposal ID |

**Request Body:**

```typescript
interface UpdateManagerProposalDto {
  proposedAmount?: number;              // Updated proposed sponsorship amount
  proposedTier?: string;                // Updated tier name
  status?: 'UNDER_MANAGER_REVIEW'       // New status
           | 'FORWARDED_TO_ORGANIZER'
           | 'REJECTED'
           | 'REQUEST_CHANGES';
  notes?: string;                        // Manager notes
 Logic:**
- Updates}
```

**Business proposal fields as provided
- Creates audit log entry with all changes

**Response:** Updated proposal object.

**Frontend API Call:**

```typescript
import { updateManagerProposal } from '@/lib/managerProposal';

const proposal = await updateManagerProposal('proposal-uuid-here', {
  status: 'APPROVED',
  proposedAmount: 10000,
  notes: 'Approved at standard rate'
});
```

---

## 6. Activity Log

### GET /manager/activity

Retrieves a paginated list of audit log entries for the manager's tenant.

**Endpoint:** `GET /api/manager/activity`

**Authorization:** MANAGER role required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| page_size | number | No | Items per page (default: 12, max: 50) |
| type | string | No | Filter by entity type (e.g., 'Event', 'Proposal', 'Company') |

**Response:**

```typescript
interface ActivityLogResponse {
  data: ActivityLogEntry[];
  total: number;
  page: number;
  page_size: number;
}

interface ActivityLogEntry {
  id: string;
  type: string;
  action: string;
  description: string;
  actor: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
```

**Frontend API Call:**

```typescript
import { fetchActivityLog } from '@/lib/manager-api';

const activity = await fetchActivityLog({
  page: 1,
  page_size: 20,
  type: 'Event'
});
```

---

## 7. Event Lifecycle

### GET /manager/events/:id/lifecycle

Retrieves the complete lifecycle view of an event including all proposals, progress, and chronological timeline.

**Endpoint:** `GET /api/manager/events/:id/lifecycle`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Event ID |

**Response:**

```typescript
interface EventLifecycleResponse {
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
  proposals: Array<{
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
  }>;
  progress: {
    totalSteps: number;
    completedSteps: number;
    percentage: number;
  };
  timeline: TimelineEntry[];
}

interface TimelineEntry {
  type: 'EVENT_CREATED' | 'EVENT_VERIFIED' | 'EVENT_REJECTED' 
      | 'PROPOSAL_SUBMITTED' | 'PROPOSAL_APPROVED' | 'PROPOSAL_REJECTED' 
      | 'PROPOSAL_STATUS_CHANGED' | 'EMAIL_SENT' | 'EMAIL_FAILED' | 'AUDIT_LOG';
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
```

**Progress Calculation:**
- Event created = 1 completed step
- Event verification = 1 step (completed if verified/rejected)
- Each proposal submission = 1 step (completed if submitted)
- Each proposal decision = 1 step (completed if approved/rejected)
- Each email = 1 step (completed only if SENT, not FAILED)

**Frontend API Call:**

```typescript
import { fetchEventLifecycle } from '@/lib/manager-api';

const lifecycle = await fetchEventLifecycle('event-uuid-here');
```

---

## 8. Company Lifecycle

### GET /manager/companies/:id/lifecycle

Retrieves the complete lifecycle view of a company including sponsorships, proposals, stats, and chronological timeline.

**Endpoint:** `GET /api/manager/companies/:id/lifecycle`

**Authorization:** MANAGER role required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | Yes | Company ID |

**Response:**

```typescript
interface CompanyLifecycleResponse {
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
  stats: {
    totalProposals: number;
    approvedProposals: number;
    rejectedProposals: number;
    totalSponsorships: number;
    totalEmails: number;
    failedEmails: number;
  };
  progress: {
    totalSteps: number;
    completedSteps: number;
    percentage: number;
  };
  timeline: CompanyTimelineEntry[];
}

interface CompanyTimelineEntry {
  type: 'COMPANY_CREATED' | 'COMPANY_VERIFIED' | 'COMPANY_REJECTED' 
      | 'SPONSORSHIP_CREATED' | 'PROPOSAL_SUBMITTED' | 'PROPOSAL_APPROVED' 
      | 'PROPOSAL_REJECTED' | 'PROPOSAL_STATUS_CHANGED' | 'EMAIL_SENT' 
      | 'EMAIL_FAILED' | 'NOTIFICATION_CREATED' | 'AUDIT_LOG';
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
```

**Stats Calculation:**
- `totalProposals`: All proposals for company's sponsorships
- `approvedProposals`: Proposals with APPROVED status
- `rejectedProposals`: Proposals with REJECTED status
- `totalSponsorships`: All sponsorships for the company
- `totalEmails`: Emails successfully sent
- `failedEmails`: Emails that failed to send

**Frontend API Call:**

```typescript
import { fetchCompanyLifecycleView } from '@/lib/manager-api';

const lifecycle = await fetchCompanyLifecycleView('company-uuid-here');
```

---

## Common Types

### Verification Payload

Used when verifying or rejecting companies and events.

```typescript
interface VerificationPayload {
  status?: 'VERIFIED' | 'REJECTED';
  action?: 'verify' | 'reject';
  notes?: string;
}
```

### Tier Type Enum

```typescript
type TierType = 
  | 'TITLE'       // Title sponsor - highest tier
  | 'PLATINUM'    // Platinum sponsor
  | 'PRESENTING'  // Presenting sponsor
  | 'POWERED_BY'  // Powered by sponsor
  | 'GOLD'        // Gold sponsor
  | 'SILVER'      // Silver sponsor
  | 'CUSTOM';     // Custom tier (for special arrangements)
```

### Event Status Enum

```typescript
type EventStatus = 
  | 'DRAFT'
  | 'UNDER_MANAGER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'COMPLETED';
```

### Proposal Status Enum

```typescript
type ProposalStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_MANAGER_REVIEW'
  | 'FORWARDED_TO_ORGANIZER'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUEST_CHANGES'
  | 'WITHDRAWN';
```

### Verification Status Enum

```typescript
enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}
```

---

## Error Responses

All endpoints may return the following error responses:

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Invalid or missing JWT token |
| 403 | Forbidden - User lacks required role |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error |

**Example Error Response:**

```json
{
  "message": "Company is already verified",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Summary of All Manager Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /manager/dashboard/stats | Get dashboard statistics |v
| GET | /manager/companies | List companies with filters |v
| GET | /manager/companies/:id | Get company details |v
| POST | /manager/companies/:id/verify | Verify or reject company |v
| GET | /manager/events | List events with filters |v
| GET | /manager/events/:id | Get event details |v
| PATCH | /manager/events/:id | Update event |v
| POST | /manager/events/:id/verify | Verify or reject event |v
| POST | /manager/events/:eventId/tiers | Create sponsorship tier |X

//i have to create :
//patch sponship tier 
// patch basic details
// patch attendees detail
// patch details


| PUT | /manager/events/:eventId/tiers/:tierId | Update sponsorship tier |v
| GET | /manager/proposals | List proposals with filters |v
| GET | /manager/proposals/:id | Get proposal details |v
| PATCH | /manager/proposals/:id | Update proposal |v
| GET | /manager/activity | Get activity log |X
| GET | /manager/events/:id/lifecycle | Get event lifecycle |X
| GET | /manager/companies/:id/lifecycle | Get company lifecycle |X

---

*Document generated for SponsiWise Platform - Manager API Reference*

