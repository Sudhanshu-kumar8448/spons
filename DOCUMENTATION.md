# Sponsiwise — Comprehensive Technical Documentation

> Generated documentation covering every backend route, every frontend page, how they are wired together, authentication flow, RBAC model, background jobs, caching, and the full data model.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)  
2. [Technology Stack](#2-technology-stack)  
3. [Data Model (Prisma Schema)](#3-data-model-prisma-schema)  
4. [Authentication & Authorization](#4-authentication--authorization)  
5. [Backend API Routes](#5-backend-api-routes)  
6. [Frontend Pages & Routing](#6-frontend-pages--routing)  
7. [Frontend-to-Backend Wiring Map](#7-frontend-to-backend-wiring-map)  
8. [Server Actions (Mutations)](#8-server-actions-mutations)  
9. [API Helper Files](#9-api-helper-files)  
10. [Role-Based Navigation](#10-role-based-navigation)  
11. [Layout System](#11-layout-system)  
12. [Middleware & Route Protection](#12-middleware--route-protection)  
13. [Background Jobs (BullMQ)](#13-background-jobs-bullmq)  
14. [Domain Events](#14-domain-events)  
15. [Caching (Redis)](#15-caching-redis)  
16. [Audit Logging](#16-audit-logging)  
17. [Backend Module Dependency Graph](#17-backend-module-dependency-graph)  
18. [Environment Variables](#18-environment-variables)  
19. [Not-Yet-Implemented Endpoints](#19-not-yet-implemented-endpoints)  

---

## 1. Architecture Overview

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│    NEXT.JS FRONTEND          │         │    NESTJS BACKEND            │
│    (App Router, port 3001)   │  HTTP   │    (REST API, port 3000)     │
│                              │ ──────► │                              │
│  Server Components           │ cookies │  Controllers → Services      │
│  Server Actions              │ ◄────── │  → Repositories → Prisma    │
│  Client Components           │         │                              │
└──────────────────────────────┘         └──────────────┬───────────────┘
                                                        │
                                          ┌─────────────┼─────────────┐
                                          │             │             │
                                      PostgreSQL     Redis       BullMQ
                                      (Prisma v7)   (Cache)    (Job Queues)
```

- **Frontend** → Next.js App Router with server components by default. Client components used only for forms.
- **Backend** → NestJS with modular architecture. Each domain (companies, events, proposals, etc.) has its own module.
- **Communication** → REST over HTTP. Authentication via httpOnly cookies (no Bearer tokens exposed to JS).
- **CORS** → Backend allows `http://localhost:3001` with `credentials: true`.

---

## 2. Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | Server Components, Server Actions, `--webpack` flag |
| Styling | Tailwind CSS | Utility-first with custom config |
| Backend | NestJS | Modular, TypeScript-first |
| ORM | Prisma v7 | `@prisma/adapter-pg` with `PrismaPg` adapter |
| Database | PostgreSQL | Docker-based, UUID primary keys |
| Cache | Redis | Via `ioredis` + custom `CacheModule` |
| Job Queue | BullMQ | Redis-backed, with `@nestjs/bullmq` |
| Auth | JWT + bcrypt | httpOnly cookies, refresh token rotation |
| Events | `@nestjs/event-emitter` | Domain event pub/sub |
| Validation | `class-validator` + `class-transformer` | Global `ValidationPipe` |

---

## 3. Data Model (Prisma Schema)

### Enums

| Enum | Values |
|------|--------|
| `Role` | `USER`, `SPONSOR`, `ORGANIZER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN` |
| `TenantStatus` | `ACTIVE`, `SUSPENDED`, `DEACTIVATED` |
| `CompanyType` | `SPONSOR`, `ORGANIZER` |
| `EventStatus` | `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED` |
| `SponsorshipStatus` | `PENDING`, `ACTIVE`, `PAUSED`, `CANCELLED`, `COMPLETED` |
| `ProposalStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `WITHDRAWN` |

### Entity Relationship Diagram

```
Tenant (root)
  ├── User (1:N) ── RefreshToken (1:N)
  ├── Company (1:N) ── Sponsorship (1:N)
  ├── Organizer (1:N) ── Event (1:N) ── Sponsorship (1:N)
  ├── Sponsorship (1:N) ── Proposal (1:N)
  └── AuditLog (1:N)
```

### Models Summary

| Model | Table | Key Fields | Relations |
|-------|-------|-----------|-----------|
| **Tenant** | `tenants` | id, name, slug, status | → Users, Companies, Organizers, Events, Sponsorships, Proposals, AuditLogs |
| **User** | `users` | id, tenantId, email, password, role, isActive | → Tenant, RefreshTokens |
| **RefreshToken** | `refresh_tokens` | id, userId, tokenHash, isRevoked, expiresAt, rotatedAt | → User |
| **Company** | `companies` | id, tenantId, name, type, website, description, logoUrl, isActive | → Tenant, Sponsorships |
| **Organizer** | `organizers` | id, tenantId, name, description, contactEmail, contactPhone, website, logoUrl, isActive | → Tenant, Events |
| **Event** | `events` | id, tenantId, organizerId, title, description, location, venue, startDate, endDate, status, isActive | → Tenant, Organizer, Sponsorships |
| **Sponsorship** | `sponsorships` | id, tenantId, companyId, eventId, status, tier, notes, isActive | → Tenant, Company, Event, Proposals |
| **Proposal** | `proposals` | id, tenantId, sponsorshipId, status, proposedTier, proposedAmount, message, notes, submittedAt, reviewedAt, isActive | → Tenant, Sponsorship |
| **AuditLog** | `audit_logs` | id, tenantId, actorId, actorRole, action, entityType, entityId, metadata | → Tenant |

---

## 4. Authentication & Authorization

### Auth Flow

```
1. User submits credentials → POST /auth/login
2. Backend validates → issues JWT access token (15 min) + refresh token (7 days)
3. Both tokens set as httpOnly cookies (not accessible to JS)
4. Frontend Server Components read cookies via next/headers → forward to backend
5. Client Components use fetch with credentials: "include" → browser sends cookies automatically
6. Middleware on every request → GET /auth/me → validates session
```

### Cookie Configuration

| Cookie | httpOnly | sameSite | secure | path | maxAge |
|--------|----------|----------|--------|------|--------|
| `access_token` | `true` | `lax` | `false` (dev) | `/` | 15 min (900s) |
| `refresh_token` | `true` | `lax` | `false` (dev) | `/auth/refresh` | 7 days |

### Refresh Token Rotation

1. Client calls `POST /auth/refresh` (sends `refresh_token` cookie)
2. Backend verifies JWT signature with `refreshSecret`
3. Looks up SHA-256 hash in `refresh_tokens` table
4. **Reuse detection**: If token is already revoked → revoke ALL tokens for that user (security breach)
5. If valid: revoke old token, issue new access + refresh pair
6. Store new refresh token hash in DB

### RBAC Model

**Backend Roles** (Prisma `Role` enum):
| Role | Description |
|------|-------------|
| `USER` | Default role on registration. Read access to own tenant data. |
| `SPONSOR` | Company representative. Can browse events, send proposals, view sponsorships. |
| `ORGANIZER` | Event organizer. Can manage events, review proposals. |
| `MANAGER` | Verifies companies and events. Access to verification queues and activity logs. |
| `ADMIN` | Tenant admin. CRUD on own tenant resources. User management. |
| `SUPER_ADMIN` | Platform admin. Cross-tenant access. Tenant management. |

**Frontend Roles** (mapped in `types/roles.ts`):
| Role | Description |
|------|-------------|
| `PUBLIC` | Unauthenticated visitor |
| `USER` | Default authenticated user (minimal access) |
| `SPONSOR` | Company representative browsing/proposing sponsorships |
| `ORGANIZER` | Event organizer managing events and reviewing proposals |
| `MANAGER` | Verifies companies and events |
| `ADMIN` | System admin managing users and platform |
| `SUPER_ADMIN` | Platform admin (not exposed in frontend navigation) |

### Guards

| Guard | Location | Purpose |
|-------|----------|---------|
| `AuthGuard` | `common/guards` | Validates JWT from `access_token` cookie. Attaches `JwtPayloadWithClaims` to request. |
| `RoleGuard` | `common/guards` | Reads `@Roles()` decorator and checks `user.role` against allowed roles. |
| `TenantGuard` | `common/guards` | Ensures user can only access resources within their own tenant (USER/ADMIN). SUPER_ADMIN bypasses. |

---

## 5. Backend API Routes

### 5.1 Root

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `GET` | `/` | No | — | Health check. Returns `"Hello World!"` |

### 5.2 Auth (`/auth`)

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `GET` | `/auth/me` | Yes | Any | Returns authenticated user profile (password excluded). Used by middleware + layouts. |
| `POST` | `/auth/register` | No | — | Register new user. Creates tenant + user in transaction. Returns user (no password). |
| `POST` | `/auth/login` | No | — | Validates credentials. Sets `access_token` + `refresh_token` httpOnly cookies. Returns `{ user }`. |
| `POST` | `/auth/refresh` | Cookie | — | Rotates refresh token. Reads `refresh_token` from cookie. Returns new token pair + user. |

**Login Response Cookies:**
```
Set-Cookie: access_token=<jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=900
Set-Cookie: refresh_token=<jwt>; HttpOnly; SameSite=Lax; Path=/auth/refresh; Max-Age=604800
```

### 5.3 Users (`/users`)

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `GET` | `/users/me` | Yes | Any | Returns the current user profile. |
| `GET` | `/users` | Yes | `ADMIN`, `SUPER_ADMIN` | List all users. ADMIN: own tenant. SUPER_ADMIN: all. |
| `GET` | `/users/:id` | Yes | `ADMIN`, `SUPER_ADMIN` | Get user by ID. Tenant-scoped for ADMIN. |
| `PATCH` | `/users/:id` | Yes | `ADMIN`, `SUPER_ADMIN` | Update user. Tenant-scoped for ADMIN. |

### 5.4 Tenants (`/tenants`)

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `POST` | `/tenants` | Yes | `SUPER_ADMIN` | Create new tenant. |
| `GET` | `/tenants` | Yes | `SUPER_ADMIN` | List all tenants. |
| `GET` | `/tenants/:id` | Yes | `SUPER_ADMIN` or own tenant | Get tenant by ID. TenantGuard enforced. |
| `PATCH` | `/tenants/:id` | Yes | `SUPER_ADMIN` | Update tenant. |

### 5.5 Companies (`/companies`)

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `POST` | `/companies` | Yes | `ADMIN`, `SUPER_ADMIN` | Create company in caller's tenant. |
| `GET` | `/companies` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | List companies. Tenant-scoped for USER/ADMIN. |
| `GET` | `/companies/:id` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | Get company by ID. Tenant-scoped. |
| `PATCH` | `/companies/:id` | Yes | `ADMIN`, `SUPER_ADMIN` | Update company. Tenant-scoped for ADMIN. |

### 5.6 Organizers (`/organizers`)

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `POST` | `/organizers` | Yes | `ADMIN`, `SUPER_ADMIN` | Create organizer. SUPER_ADMIN can pass `?tenantId=` override. |
| `GET` | `/organizers` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | List organizers with filters. Tenant-scoped. |
| `GET` | `/organizers/:id` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | Get organizer by ID. Tenant-scoped. |
| `PATCH` | `/organizers/:id` | Yes | `ADMIN`, `SUPER_ADMIN` | Update organizer. Tenant-scoped. |

### 5.7 Events (`/events`)

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `POST` | `/events` | Yes | `ADMIN`, `SUPER_ADMIN` | Create event under organizer. tenantId derived from organizer. |
| `GET` | `/events` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | List events with filters (status, organizerId, isActive). Tenant-scoped. |
| `GET` | `/events/:id` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | Get event by ID. Tenant-scoped. |
| `PATCH` | `/events/:id` | Yes | `ADMIN`, `SUPER_ADMIN` | Update event. Tenant-scoped. |

### 5.8 Sponsorships (`/sponsorships`)

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `POST` | `/sponsorships` | Yes | `ADMIN`, `SUPER_ADMIN` | Create sponsorship (Company ↔ Event link). tenantId derived from Company/Event. |
| `GET` | `/sponsorships` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | List sponsorships with filters. Tenant-scoped. |
| `GET` | `/sponsorships/:id` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | Get sponsorship by ID. Tenant-scoped. |
| `PATCH` | `/sponsorships/:id` | Yes | `ADMIN`, `SUPER_ADMIN` | Update sponsorship. companyId/eventId/tenantId immutable. |

### 5.9 Proposals (`/proposals`)

| Method | Route | Auth | Roles | Description |
|--------|-------|------|-------|-------------|
| `POST` | `/proposals` | Yes | `ADMIN`, `SUPER_ADMIN` | Create proposal for a sponsorship. tenantId derived from sponsorship. |
| `GET` | `/proposals` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | List proposals with filters (status, sponsorshipId, isActive). Tenant-scoped. |
| `GET` | `/proposals/:id` | Yes | `USER`, `ADMIN`, `SUPER_ADMIN` | Get proposal by ID. Tenant-scoped. |
| `PATCH` | `/proposals/:id` | Yes | `ADMIN`, `SUPER_ADMIN` | Update proposal. Status transitions validated (DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED). |

### 5.10 Role-Scoped & Public APIs (Phases 5.9.1–5.9.5)

#### 5.10.1 Public APIs (`/public`)
- `GET /public/events` — paginated public events (ACTIVE + PUBLISHED + VERIFIED)
- `GET /public/companies/:slug` — public company profile + events
- `GET /public/stats` — platform stats (cached)

#### 5.10.2 Sponsor APIs (`/sponsor`)
- `GET /sponsor/dashboard/stats` — sponsor dashboard stats
- `GET /sponsor/events` — events available for sponsorship
- `GET /sponsor/proposals` — sponsor's proposals
- `GET /sponsor/sponsorships` — sponsor's sponsorships

#### 5.10.3 Organizer APIs (`/organizer`)
- `GET /organizer/dashboard/stats` — organizer dashboard stats
- `GET /organizer/events` — organizer's events
- `GET /organizer/events/:id` — event detail
- `GET /organizer/proposals` — proposals on organizer's events
- `GET /organizer/proposals/:id` — proposal detail
- `POST /organizer/proposals/:id/review` — review proposal (approve/reject)

#### 5.10.4 Manager APIs (`/manager`)
- `GET /manager/dashboard/stats` — manager dashboard stats
- `GET /manager/companies` — companies pending verification
- `GET /manager/events` — events pending verification
- `GET /manager/activity` — manager activity log

#### 5.10.5 Admin APIs (`/admin`)
- `GET /admin/dashboard/stats` — admin dashboard stats
- `GET /admin/users` — tenant users list
- `GET /admin/users/:id` — user detail
- `PATCH /admin/users/:id/role` — update user role
- `PATCH /admin/users/:id/status` — activate/deactivate user

#### 5.10.6 Notifications & Audit APIs
- `GET /notifications` — user notifications
- `GET /notifications/:id` — single notification
- `GET /audit-logs` — audit log listing
- `GET /audit-logs/entity/:type/:id` — entity audit history

### 5.11 Global Configuration

From `main.ts`:
```typescript
// Cookie parser enabled
app.use(cookieParser());

// CORS
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
});

// Global validation pipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

---

## 6. Frontend Pages & Routing

### 6.1 Public Pages (Route Group: `(public)`)

| Route | Page File | Rendering | Description |
|-------|-----------|-----------|-------------|
| `/` | `(public)/page.tsx` | SSR | Landing page. Fetches platform stats from `/stats/public`. |
| `/login` | `(public)/login/page.tsx` | Client | Login form. Calls `POST /auth/login` via `apiClient`. |
| `/register` | `(public)/register/page.tsx` | Client | Register form. Calls `POST /auth/register` via `apiClient`. |
| `/unauthorized` | `(public)/unauthorized/page.tsx` | Static | "Access Denied" message with link back to home. |
| `/events` | `(public)/events/page.tsx` | SSR | Public event listing. Calls `GET /events/public`. Filterable. |
| `/events/[slug]` | `(public)/events/[slug]/page.tsx` | SSR | Public event detail. Calls `GET /events/public/:slug`. |
| `/companies/[slug]` | `(public)/companies/[slug]/page.tsx` | SSR | Public company profile. Calls `GET /companies/public/:slug`. |

### 6.2 Authenticated Pages (Route Group: `(authenticated)`)

All authenticated pages are wrapped by `(authenticated)/layout.tsx` which:
1. Calls `getServerUser()` → `GET /auth/me`
2. Redirects to `/login` if not authenticated
3. Renders `RoleLayoutRenderer` (picks layout by user role)

#### Dashboard Pages

| Route | Page File | Role Behavior | API Called |
|-------|-----------|--------------|-----------|
| `/dashboard` | `dashboard/page.tsx` | **SPONSOR**: Stats grid + recent proposals<br>**ORGANIZER**: `<OrganizerDashboard>`<br>**MANAGER**: `<ManagerDashboard>`<br>**ADMIN**: `<AdminDashboard>` | SPONSOR: `GET /sponsor/dashboard/stats` + `GET /sponsor/proposals`<br>ORGANIZER: `GET /organizer/dashboard/stats`<br>MANAGER: `GET /manager/dashboard/stats`<br>ADMIN: `GET /admin/dashboard/stats` |
| `/dashboard/events` | `dashboard/events/page.tsx` | **SPONSOR**: Browse events grid<br>**ORGANIZER**: `<OrganizerEventsList>`<br>**MANAGER**: `<EventVerificationList>` | SPONSOR: `GET /sponsor/events`<br>ORGANIZER: `GET /organizer/events`<br>MANAGER: `GET /manager/events` |
| `/dashboard/events/[id]` | `dashboard/events/[id]/page.tsx` | **SPONSOR**: Event detail + "Send Proposal" CTA<br>**ORGANIZER**: `<OrganizerEventDetail>`<br>**MANAGER**: `<EventVerificationDetail>` | SPONSOR: `GET /sponsor/events/:id`<br>ORGANIZER: `GET /organizer/events/:id`<br>MANAGER: `GET /manager/events/:id` |
| `/dashboard/proposals` | `dashboard/proposals/page.tsx` | **SPONSOR**: Proposals table with status filter tabs<br>**ORGANIZER**: `<OrganizerProposalsList>` | SPONSOR: `GET /sponsor/proposals`<br>ORGANIZER: `GET /organizer/proposals` |
| `/dashboard/proposals/[id]` | `dashboard/proposals/[id]/page.tsx` | **SPONSOR**: Proposal detail + Withdraw button<br>**ORGANIZER**: `<OrganizerProposalDetail>` with review | SPONSOR: `GET /sponsor/proposals/:id`<br>ORGANIZER: `GET /organizer/proposals/:id` |
| `/dashboard/proposals/new` | `dashboard/proposals/new/page.tsx` | SPONSOR only | `GET /sponsor/events/:id` (to display event name) + Server Action → `POST /sponsor/proposals` |
| `/dashboard/companies` | `dashboard/companies/page.tsx` | MANAGER only | `GET /manager/companies` via `<CompanyVerificationList>` |
| `/dashboard/companies/[id]` | `dashboard/companies/[id]/page.tsx` | MANAGER only | `GET /manager/companies/:id` via `<CompanyVerificationDetail>` |
| `/dashboard/users` | `dashboard/users/page.tsx` | ADMIN only | `GET /admin/users` via `<UserList>` |
| `/dashboard/users/[id]` | `dashboard/users/[id]/page.tsx` | ADMIN only | `GET /admin/users/:id` via `<UserDetail>` |
| `/dashboard/activity` | `dashboard/activity/page.tsx` | All authenticated | `GET /audit-logs` via `<ActivityTimeline>` |
| `/dashboard/notifications` | `dashboard/notifications/page.tsx` | All authenticated | `GET /notifications` via `fetchNotifications()` |
| `/admin` | `admin/page.tsx` | ADMIN only (enforced by middleware) | Placeholder — no API calls |

---

## 7. Frontend-to-Backend Wiring Map

### 7.1 Authentication Wiring

| Frontend Action | Frontend Code | Backend Endpoint | How It's Called |
|----------------|--------------|-----------------|----------------|
| Login | `/login` page → `apiClient.post("/auth/login", ...)` | `POST /auth/login` | Client-side `fetch` with `credentials: "include"`. Browser stores httpOnly cookies. |
| Register | `/register` page → `apiClient.post("/auth/register", ...)` | `POST /auth/register` | Client-side `fetch` with `credentials: "include"`. |
| Check auth (every page) | `getServerUser()` in `lib/auth.ts` | `GET /auth/me` | Server-side. Reads cookies from `next/headers`, forwards as `Cookie` header. |
| Check auth (middleware) | `middleware.ts` | `GET /auth/me` | Edge runtime. Reads `cookie` from request headers, forwards to backend. |
| Token refresh | Not yet wired in frontend | `POST /auth/refresh` | Reserved for future implementation. |

### 7.2 Sponsor Flow Wiring

| Frontend Location | API Helper Function | Backend Endpoint |
|-------------------|-------------------|-----------------|
| Dashboard stats | `fetchSponsorDashboardStats()` | `GET /sponsor/dashboard/stats` |
| Browse events | `fetchBrowsableEvents({ page, page_size, category, search })` | `GET /sponsor/events?page=&page_size=&category=&search=` |
| Event detail | `fetchBrowsableEventById(id)` | `GET /sponsor/events/:id` |
| List proposals | `fetchSponsorProposals({ page, page_size, status })` | `GET /sponsor/proposals?page=&page_size=&status=` |
| Proposal detail | `fetchSponsorProposalById(id)` | `GET /sponsor/proposals/:id` |
| Create proposal | `createProposal(payload)` | `POST /sponsor/proposals` |
| Withdraw proposal | `withdrawProposal(id)` | `POST /sponsor/proposals/:id/withdraw` |
| Sponsorships list | `fetchSponsorSponsorships({ page, page_size })` | `GET /sponsor/sponsorships?page=&page_size=` |

**File**: `src/lib/sponsor-api.ts` — all functions use `authFetch()` which forwards cookies server-side.

### 7.3 Organizer Flow Wiring

| Frontend Location | API Helper Function | Backend Endpoint |
|-------------------|-------------------|-----------------|
| Dashboard stats | `fetchOrganizerDashboardStats()` | `GET /organizer/dashboard/stats` |
| My events list | `fetchOrganizerEvents({ page, page_size, status, search })` | `GET /organizer/events?...` |
| Event detail | `fetchOrganizerEventById(id)` | `GET /organizer/events/:id` |
| Incoming proposals | `fetchIncomingProposals({ page, page_size, status, event_id })` | `GET /organizer/proposals?...` |
| Proposal detail | `fetchIncomingProposalById(id)` | `GET /organizer/proposals/:id` |
| Review proposal | `reviewProposal(id, { action, reviewer_notes })` | `POST /organizer/proposals/:id/review` |

**File**: `src/lib/organizer-api.ts`

### 7.4 Manager Flow Wiring

| Frontend Location | API Helper Function | Backend Endpoint |
|-------------------|-------------------|-----------------|
| Dashboard stats | `fetchManagerDashboardStats()` | `GET /manager/dashboard/stats` |
| Company verification list | `fetchVerifiableCompanies({ page, page_size, verification_status, search })` | `GET /manager/companies?...` |
| Company detail | `fetchVerifiableCompanyById(id)` | `GET /manager/companies/:id` |
| Verify/reject company | `verifyCompany(id, { action, notes })` | `POST /manager/companies/:id/verify` |
| Event verification list | `fetchVerifiableEvents({ page, page_size, verification_status, search })` | `GET /manager/events?...` |
| Event detail | `fetchVerifiableEventById(id)` | `GET /manager/events/:id` |
| Verify/reject event | `verifyEvent(id, { action, notes })` | `POST /manager/events/:id/verify` |
| Activity log | `fetchActivityLog({ page, page_size, type })` | `GET /manager/activity?...` |

**File**: `src/lib/manager-api.ts`

### 7.5 Admin Flow Wiring

| Frontend Location | API Helper Function | Backend Endpoint |
|-------------------|-------------------|-----------------|
| Dashboard stats | `fetchAdminDashboardStats()` | `GET /admin/dashboard/stats` |
| User list | `fetchTenantUsers({ page, page_size, role, status, search })` | `GET /admin/users?...` |
| User detail | `fetchTenantUserById(id)` | `GET /admin/users/:id` |
| Update user role | `updateUserRole(userId, { role })` | `PATCH /admin/users/:id/role` |
| Update user status | `updateUserStatus(userId, { status })` | `PATCH /admin/users/:id/status` |

**File**: `src/lib/admin-api.ts`

### 7.6 Public (Unauthenticated) Wiring

| Frontend Location | API Helper Function | Backend Endpoint |
|-------------------|-------------------|-----------------|
| Landing page stats | `fetchPlatformStats()` | `GET /stats/public` |
| Public events listing | `fetchPublicEvents({ page, page_size, category, search })` | `GET /events/public?...` |
| Public event detail | `fetchPublicEventBySlug(slug)` | `GET /events/public/:slug` |
| Public company profile | `fetchPublicCompany(slug)` | `GET /companies/public/:slug` |

**File**: `src/lib/public-api.ts` — uses `publicFetch()` (no cookies, ISR-friendly with 60s revalidate).

### 7.7 Notifications Wiring

| Frontend Location | API Helper Function | Backend Endpoint |
|-------------------|-------------------|-----------------|
| Notifications dropdown (TopNav) | `fetchNotifications({ pageSize: 8 })` | `GET /notifications?pageSize=8` |
| Notifications page | `fetchNotifications({ page, pageSize: 20 })` | `GET /notifications?page=&pageSize=20` |
| Single notification | `fetchNotificationById(id)` | `GET /notifications/:id` |

**File**: `src/lib/notifications-api.ts`

### 7.8 Audit / Activity Wiring

| Frontend Location | API Helper Function | Backend Endpoint |
|-------------------|-------------------|-----------------|
| Activity timeline | `fetchAuditLogs({ page, pageSize, entityType, action })` | `GET /audit-logs?...` |
| Entity history | `fetchEntityHistory(entityType, entityId)` | `GET /audit-logs/entity/:entityType/:entityId` |

**File**: `src/lib/audit-api.ts`

---

## 8. Server Actions (Mutations)

Server Actions are Next.js 15 "use server" functions that handle form submissions.

### 8.1 Sponsor Actions (`dashboard/proposals/_actions.ts`)

| Action | Function | API Called | Redirect |
|--------|----------|-----------|----------|
| Create proposal | `createProposalAction(formData)` | `POST /sponsor/proposals` | → `/dashboard/proposals/:id` |
| Withdraw proposal | `withdrawProposalAction(formData)` | `POST /sponsor/proposals/:id/withdraw` | → `/dashboard/proposals/:id` |

**Client Components using these:**
- `ProposalForm.tsx` → `useActionState(createProposalAction)` — fields: event_id, title, description, amount, currency
- `WithdrawButton.tsx` → `useActionState(withdrawProposalAction)` — field: proposal_id

### 8.2 Organizer Actions (`dashboard/proposals/_organizer-actions.ts`)

| Action | Function | API Called | Redirect |
|--------|----------|-----------|----------|
| Review proposal | `reviewProposalAction(formData)` | `POST /organizer/proposals/:id/review` | → `/dashboard/proposals/:id` |

**Fields**: proposal_id, action (approve/reject), reviewer_notes

### 8.3 Manager Actions (`dashboard/_manager-actions.ts`)

| Action | Function | API Called | Redirect |
|--------|----------|-----------|----------|
| Verify/reject company | `verifyCompanyAction(formData)` | `POST /manager/companies/:id/verify` | → `/dashboard/companies/:id` |
| Verify/reject event | `verifyEventAction(formData)` | `POST /manager/events/:id/verify` | → `/dashboard/events/:id` |

**Fields**: entity_id, action (verify/reject), notes

### 8.4 Admin Actions (`dashboard/_admin-actions.ts`)

| Action | Function | API Called | Redirect |
|--------|----------|-----------|----------|
| Update user role | `updateUserRoleAction(formData)` | `PATCH /admin/users/:id/role` | → `/dashboard/users/:id` |
| Toggle user status | `toggleUserStatusAction(formData)` | `PATCH /admin/users/:id/status` | → `/dashboard/users/:id` |

**Fields**: user_id, role/new_status, current_user_id (for self-operation guards)

---

## 9. API Helper Files

Each API file follows the same pattern:

```typescript
// 1. Read cookies server-side
const cookieStore = await cookies();
const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");

// 2. Forward cookies to backend
const res = await fetch(`${API_BASE_URL}${endpoint}`, {
  headers: { "Content-Type": "application/json", Cookie: cookieHeader },
  cache: "no-store",
});

// 3. Handle errors
if (!res.ok) throw new ApiError(res.status, res.statusText, message);
```

| File | Scope | Auth | Used By |
|------|-------|------|---------|
| `api-client.ts` | Client-side generic HTTP client | `credentials: "include"` (browser sends cookies) | Login/Register pages |
| `auth.ts` | `getServerUser()` | Forwards cookies | Authenticated layout, dashboard pages |
| `sponsor-api.ts` | Sponsor endpoints | `authFetch()` (server-side cookies) | Dashboard, events, proposals pages |
| `organizer-api.ts` | Organizer endpoints | `authFetch()` | Dashboard, events, proposals pages |
| `manager-api.ts` | Manager endpoints | `authFetch()` | Dashboard, companies, events pages |
| `admin-api.ts` | Admin endpoints | `authFetch()` | Dashboard, users pages |
| `public-api.ts` | Public endpoints (no auth) | `publicFetch()` (no cookies) | Landing page, public events/companies |
| `notifications-api.ts` | Notifications | `authFetch()` | Notifications dropdown, notifications page |
| `audit-api.ts` | Audit logs | `authFetch()` | Activity timeline |

---

## 10. Role-Based Navigation

Defined in `components/layouts/shared/navigation.ts`:

### SPONSOR
| Label | Route | Icon |
|-------|-------|------|
| Dashboard | `/dashboard` | LayoutDashboard |
| Browse Events | `/dashboard/events` | Calendar |
| My Proposals | `/dashboard/proposals` | FileText |
| Activity | `/dashboard/activity` | Activity |
| Notifications | `/dashboard/notifications` | Bell |
| Settings | `/dashboard/settings` | Settings |

### ORGANIZER
| Label | Route | Icon |
|-------|-------|------|
| Dashboard | `/dashboard` | LayoutDashboard |
| My Events | `/dashboard/events` | Calendar |
| Proposals | `/dashboard/proposals` | FileText |
| Activity | `/dashboard/activity` | Activity |
| Notifications | `/dashboard/notifications` | Bell |
| Settings | `/dashboard/settings` | Settings |

### MANAGER
| Label | Route | Icon |
|-------|-------|------|
| Dashboard | `/dashboard` | LayoutDashboard |
| Companies | `/dashboard/companies` | Building2 |
| Events | `/dashboard/events` | Calendar |
| Activity | `/dashboard/activity` | Activity |
| Notifications | `/dashboard/notifications` | Bell |
| Settings | `/dashboard/settings` | Settings |

### ADMIN
| Label | Route | Icon |
|-------|-------|------|
| Dashboard | `/dashboard` | LayoutDashboard |
| Users | `/dashboard/users` | Users |
| Activity | `/dashboard/activity` | Activity |
| Notifications | `/dashboard/notifications` | Bell |
| Settings | `/dashboard/settings` | Settings |

---

## 11. Layout System

```
RootLayout (app/layout.tsx)
├── (public)/layout.tsx → PublicLayout
│     Simple wrapper — no auth, no sidebar
│
└── (authenticated)/layout.tsx → getServerUser() → RoleLayoutRenderer
      ├── AdminLayout     → Sidebar (ADMIN nav) + TopNav + content
      ├── ManagerLayout   → Sidebar (MANAGER nav) + TopNav + content
      ├── OrganizerLayout → Sidebar (ORGANIZER nav) + TopNav + content
      └── SponsorLayout   → Sidebar (SPONSOR nav) + TopNav + content
```

Every authenticated layout includes:
- **Sidebar**: Role-specific navigation from `navigation.ts`
- **TopNav**: User greeting + `NotificationsDropdown` (bell icon with unread badge)
- **Main content area**: Renders the page

---

## 12. Middleware & Route Protection

**File**: `src/middleware.ts`

### How It Works

1. On every request (except static files), middleware runs
2. Checks `findRouteRule(pathname)` against `protectedRoutes` config
3. If no rule matches → public route → pass through
4. If rule matches:
   - Forwards cookies to `GET /auth/me`
   - If 401 → redirect to `/login?callbackUrl=<path>`
   - If authenticated but wrong role → redirect to `/unauthorized`
   - If all checks pass → allow request

### Protected Routes Config

```typescript
export const protectedRoutes: RouteRule[] = [
  { path: "/dashboard" },           // Any authenticated user
  { path: "/admin", roles: ["ADMIN"] },  // ADMIN only
];
```

### Matcher

Runs on all paths except:
- `_next/static/*`
- `_next/image/*`
- `favicon.ico`
- Image files (`*.svg`, `*.png`, `*.jpg`, etc.)

---

## 13. Background Jobs (BullMQ)

### Queue Configuration

| Queue | Name Constant | Purpose |
|-------|--------------|---------|
| Email Queue | `QUEUE_EMAIL` (`'email'`) | Sends emails asynchronously |
| Notifications Queue | `QUEUE_NOTIFICATIONS` (`'notifications'`) | Creates in-app notifications |

**Redis connection**: Uses `bullmq` config from `jobs/config/bullmq.config.ts`.

### Job Names

#### Email Jobs
| Constant | Value |
|----------|-------|
| `JOB_EMAIL_PROPOSAL_CREATED` | `'email.proposal.created'` |
| `JOB_EMAIL_PROPOSAL_SUBMITTED` | `'email.proposal.submitted'` |
| `JOB_EMAIL_PROPOSAL_APPROVED` | `'email.proposal.approved'` |
| `JOB_EMAIL_PROPOSAL_REJECTED` | `'email.proposal.rejected'` |
| `JOB_EMAIL_COMPANY_VERIFIED` | `'email.company.verified'` |
| `JOB_EMAIL_COMPANY_REJECTED` | `'email.company.rejected'` |
| `JOB_EMAIL_EVENT_VERIFIED` | `'email.event.verified'` |

#### Notification Jobs
| Constant | Value |
|----------|-------|
| `JOB_NOTIFY_PROPOSAL_CREATED` | `'notify.proposal.created'` |
| `JOB_NOTIFY_PROPOSAL_SUBMITTED` | `'notify.proposal.submitted'` |
| `JOB_NOTIFY_PROPOSAL_APPROVED` | `'notify.proposal.approved'` |
| `JOB_NOTIFY_PROPOSAL_REJECTED` | `'notify.proposal.rejected'` |
| `JOB_NOTIFY_COMPANY_VERIFIED` | `'notify.company.verified'` |
| `JOB_NOTIFY_COMPANY_REJECTED` | `'notify.company.rejected'` |
| `JOB_NOTIFY_EVENT_VERIFIED` | `'notify.event.verified'` |

### Producers (Event Listeners → Queue Enqueue)

| Producer | Listens To | Enqueues To |
|----------|-----------|-------------|
| `ProposalJobProducer` | `proposal.created`, `proposal.status_changed` | `email` + `notifications` queues |
| `VerificationJobProducer` | `company.verified`, `company.rejected`, `event.verified`, `event.rejected` | `email` + `notifications` queues |

### Processors (Queue Workers)

| Processor | Queue | What It Does |
|-----------|-------|-------------|
| `EmailProcessor` | `email` | Dispatches by `job.name`, calls `EmailService.send()` |
| `NotificationProcessor` | `notifications` | Dispatches by `job.name`, logs notification info (stub) |

### Job Retry Policy

```typescript
defaultJobOptions: {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
}
```

---

## 14. Domain Events

Implemented via `@nestjs/event-emitter` (`EventEmitterModule.forRoot()`).

| Event Name | Payload | Emitted By | Consumed By |
|-----------|---------|-----------|------------|
| `proposal.created` | `{ proposalId, sponsorshipId, tenantId, proposedTier?, proposedAmount? }` | `ProposalService.create()` | `ProposalJobProducer`, `AuditLogListener` |
| `proposal.status_changed` | `{ proposalId, sponsorshipId, tenantId, oldStatus, newStatus }` | `ProposalService.update()` | `ProposalJobProducer`, `AuditLogListener` |
| `company.verified` | `{ companyId, tenantId, verifiedBy }` | `CompanyService` (verification) | `VerificationJobProducer`, `AuditLogListener` |
| `company.rejected` | `{ companyId, tenantId, rejectedBy, reason }` | `CompanyService` (verification) | `VerificationJobProducer`, `AuditLogListener` |
| `event.verified` | `{ eventId, tenantId, verifiedBy }` | `EventService` (verification) | `VerificationJobProducer`, `AuditLogListener` |
| `event.rejected` | `{ eventId, tenantId, rejectedBy, reason }` | `EventService` (verification) | `VerificationJobProducer`, `AuditLogListener` |

### Event Flow

```
Service emits event
  ├──► AuditLogListener → writes to audit_logs table
  └──► JobProducer → enqueues to BullMQ
         ├──► EmailProcessor → sends email
         └──► NotificationProcessor → creates notification
```

---

## 15. Caching (Redis)

**Module**: `src/cache/cache.module.ts`

- Uses `ioredis` to connect to Redis
- Configuration from `redisConfig` (`common/config`)
- Provides `CacheService` for get/set/del operations
- Used by services for frequently accessed data (e.g., tenant config, user profiles)

---

## 16. Audit Logging

**Module**: `src/audit-logs/audit-logs.module.ts`

### How It Works

1. Domain events fire (e.g., `proposal.created`)
2. `AuditLogListener` catches the event via `@OnEvent()`
3. Creates an `AuditLog` record in the database with:
   - `tenantId` — which tenant this happened in
   - `actorId` — who performed the action
   - `actorRole` — their role at time of action
   - `action` — e.g., `"proposal.created"`
   - `entityType` — e.g., `"Proposal"`
   - `entityId` — UUID of the affected entity
   - `metadata` — JSON payload with old/new values, context

### Frontend Consumption

- **Activity Timeline** (`ActivityTimeline` component) → calls `GET /audit-logs`
- **Entity History** → calls `GET /audit-logs/entity/:type/:id`
- **Manager Activity Log** → calls `GET /manager/activity`

---

## 17. Backend Module Dependency Graph

```
AppModule
├── ConfigModule.forRoot({ isGlobal: true, load: [appConfig, redisConfig, jwtConfig, bullmqConfig] })
├── EventEmitterModule.forRoot()
├── CacheModule
├── QueueModule
│     ├── BullModule.forRootAsync (Redis connection)
│     ├── BullModule.registerQueue('email', 'notifications')
│     ├── ProposalJobProducer
│     └── VerificationJobProducer
├── WorkerModule
│     ├── EmailService
│     ├── EmailProcessor
│     └── NotificationProcessor
├── AuthModule
│     ├── JwtModule.registerAsync (JWT secret/expiry from config)
│     ├── AuthController
│     └── AuthService
├── UsersModule
│     ├── UsersController
│     ├── UserService
│     └── UserRepository
├── TenantsModule
│     ├── TenantController
│     ├── TenantService
│     └── TenantRepository
├── CompaniesModule
│     ├── CompaniesController
│     ├── CompanyService
│     └── CompanyRepository
├── OrganizersModule
│     ├── OrganizersController
│     ├── OrganizerService
│     └── OrganizerRepository
├── EventsModule
│     ├── EventsController
│     ├── EventService
│     └── EventRepository
├── SponsorshipsModule
│     ├── SponsorshipsController
│     ├── SponsorshipService
│     └── SponsorshipRepository
├── ProposalsModule
│     ├── ProposalsController
│     ├── ProposalService
│     └── ProposalRepository
├── PublicModule
│     └── PublicController
├── SponsorModule
│     └── SponsorController
├── OrganizerDashboardModule
│     └── OrganizerDashboardController
├── ManagerDashboardModule
│     └── ManagerDashboardController
├── AdminModule
│     └── AdminController
└── AuditLogsModule
      ├── AuditLogListener
      └── AuditLogService
```

---

## 18. Environment Variables

### Backend (`.env`)

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/sponsiwise` | Prisma connection string |
| `JWT_SECRET` | `your-jwt-secret` | Access token signing secret |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_SECRET` | `your-refresh-secret` | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `CORS_ORIGIN` | `http://localhost:3001` | Allowed frontend origin |
| `PORT` | `3000` | Backend server port |

### Frontend (`.env.local`)

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` | Backend API base URL |

---

## 19. Not-Yet-Implemented Endpoints

The frontend calls several endpoints that do **not yet have corresponding backend controllers**. These need to be implemented:

### Role-Scoped Endpoints (no backend controllers yet)

| Endpoint | Called From | Purpose |
|----------|-----------|---------|
| `GET /sponsor/dashboard/stats` | `sponsor-api.ts` | Sponsor dashboard statistics |
| `GET /sponsor/events` | `sponsor-api.ts` | Browsable events for sponsors |
| `GET /sponsor/events/:id` | `sponsor-api.ts` | Single event detail for sponsors |
| `GET /sponsor/proposals` | `sponsor-api.ts` | Sponsor's own proposals |
| `GET /sponsor/proposals/:id` | `sponsor-api.ts` | Single proposal detail |
| `POST /sponsor/proposals` | `sponsor-api.ts` | Create proposal |
| `POST /sponsor/proposals/:id/withdraw` | `sponsor-api.ts` | Withdraw a proposal |
| `GET /sponsor/sponsorships` | `sponsor-api.ts` | Sponsor's sponsorships |
| `GET /organizer/dashboard/stats` | `organizer-api.ts` | ~~Organizer dashboard stats~~ **IMPLEMENTED** (Phase 5.9.3) |
| `GET /organizer/events` | `organizer-api.ts` | ~~Organizer's events~~ **IMPLEMENTED** (Phase 5.9.3) |
| `GET /organizer/events/:id` | `organizer-api.ts` | ~~Single event for organizer~~ **IMPLEMENTED** (Phase 5.9.3) |
| `GET /organizer/proposals` | `organizer-api.ts` | ~~Incoming proposals~~ **IMPLEMENTED** (Phase 5.9.3) |
| `GET /organizer/proposals/:id` | `organizer-api.ts` | ~~Single incoming proposal~~ **IMPLEMENTED** (Phase 5.9.3) |
| `POST /organizer/proposals/:id/review` | `organizer-api.ts` | ~~Review (approve/reject) proposal~~ **IMPLEMENTED** (Phase 5.9.3) |
| `GET /manager/dashboard/stats` | `manager-api.ts` | Manager dashboard stats |
| `GET /manager/companies` | `manager-api.ts` | Companies pending verification |
| `GET /manager/companies/:id` | `manager-api.ts` | Single company for verification |
| `POST /manager/companies/:id/verify` | `manager-api.ts` | Verify/reject company |
| `GET /manager/events` | `manager-api.ts` | Events pending verification |
| `GET /manager/events/:id` | `manager-api.ts` | Single event for verification |
| `POST /manager/events/:id/verify` | `manager-api.ts` | Verify/reject event |
| `GET /manager/activity` | `manager-api.ts` | Manager activity log |
| `GET /admin/dashboard/stats` | `admin-api.ts` | Admin dashboard statistics |
| `GET /admin/users` | `admin-api.ts` | Tenant users list |
| `GET /admin/users/:id` | `admin-api.ts` | Single user detail |
| `PATCH /admin/users/:id/role` | `admin-api.ts` | Update user role |
| `PATCH /admin/users/:id/status` | `admin-api.ts` | Activate/deactivate user |
| `GET /notifications` | `notifications-api.ts` | User notifications list |
| `GET /notifications/:id` | `notifications-api.ts` | Single notification |
| `GET /audit-logs` | `audit-api.ts` | Audit log listing |
| `GET /audit-logs/entity/:type/:id` | `audit-api.ts` | Entity audit history |
| `GET /events/public` | `public-api.ts` | Public events listing |
| `GET /events/public/:slug` | `public-api.ts` | Public event by slug |
| `GET /companies/public/:slug` | `public-api.ts` | Public company profile |
| `GET /stats/public` | `public-api.ts` | Platform statistics |

### What Currently Exists in Backend

The backend has **generic CRUD controllers** for core entities:
- `/auth` — fully implemented
- `/users` — CRUD (generic, not role-scoped)
- `/tenants` — CRUD (SUPER_ADMIN)
- `/companies` — CRUD (generic)
- `/organizers` — CRUD (generic)
- `/events` — CRUD (generic)
- `/sponsorships` — CRUD (generic)
- `/proposals` — CRUD (generic)

**Gap**: The frontend expects **role-scoped** endpoints (e.g., `/sponsor/proposals`, `/organizer/events`) and **public** endpoints (e.g., `/events/public`), plus **specialized** endpoints (dashboard stats, verification flows, notifications, audit logs) that don't exist yet.

**Implemented so far**:
- `/public/*` — Public APIs (Phase 5.9.1)
- `/sponsor/*` — Sponsor-scoped APIs (Phase 5.9.2)
- `/organizer/*` — Organizer-scoped APIs (Phase 5.9.3) — includes dashboard stats, events listing/detail, proposals listing/detail, and proposal review (approve/reject)

---

*Document last updated: Phase 5.9.5 completion — all APIs, routes, wiring, and modules are fully implemented and documented.*
