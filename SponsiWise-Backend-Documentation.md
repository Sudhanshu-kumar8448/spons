# SponsiWise - Backend & API Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Endpoints](#api-endpoints)
7. [Frontend-Backend Communication](#frontend-backend-communication)
8. [Project Structure](#project-structure)
9. [Getting Started](#getting-started)

---

## Project Overview

**SponsiWise** is a sponsorship management platform that connects event organizers with potential sponsors. The platform enables:

- **Event Organizers** to create and manage events, receive sponsorship proposals
- **Sponsors** to discover events, submit sponsorship proposals
- **Managers** to verify companies and events, oversee the platform
- **Admins** to manage users, tenants, and platform settings

---

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (access tokens + refresh tokens)
- **Caching**: Redis
- **Queue**: BullMQ for background jobs
- **Validation**: class-validator / class-transformer
- **Security**: Helmet, CORS, CSRF protection, Rate limiting

### Frontend
- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

---

## Architecture

### Multi-Tenant Architecture
The application uses a **multi-tenant** architecture where:
- Each tenant represents an organization/domain
- All data (users, companies, events, sponsorships) is scoped to a tenant
- Tenant isolation is enforced at the service layer
- SUPER_ADMIN can access all tenants

### Request Flow
```
Client → Next.js (Frontend) → NestJS (Backend) → PostgreSQL/Redis
         ↓
      HTTP Cookies (JWT)
```

### Security Layers
1. **Authentication** - JWT tokens in HTTP-only cookies
2. **Authorization** - Role-based access control (RBAC)
3. **Tenant Isolation** - Data scoping by tenant_id
4. **Rate Limiting** - 60 requests per minute globally
5. **CSRF Protection** - Origin header validation

---

## Database Schema

### Core Models

#### Tenant (Organization)
```
- id: UUID (primary key)
- name: String
- slug: String (unique)
- status: ACTIVE | SUSPENDED | DEACTIVATED
- createdAt, updatedAt: DateTime
```

#### User
```
- id: UUID (primary key)
- tenantId: UUID (foreign key)
- companyId: UUID (optional - for sponsors)
- organizerId: UUID (optional - for organizers)
- email: String (unique)
- password: String (hashed bcrypt)
- role: USER | SPONSOR | ORGANIZER | MANAGER | ADMIN | SUPER_ADMIN
- isActive: Boolean
- createdAt, updatedAt: DateTime
```

#### Company (Sponsor Organization)
```
- id: UUID (primary key)
- tenantId: UUID (foreign key)
- name: String
- slug: String (unique)
- type: SPONSOR | ORGANIZER
- website, description, logoUrl: String (optional)
- verificationStatus: PENDING | VERIFIED | REJECTED
- isActive: Boolean
- createdAt, updatedAt: DateTime
```

#### Organizer
```
- id: UUID (primary key)
- tenantId: UUID (foreign key)
- name, description, contactEmail, contactPhone, website, logoUrl
- isActive: Boolean
- createdAt, updatedAt: DateTime
```

#### Event
```
- id: UUID (primary key)
- tenantId: UUID (foreign key)
- organizerId: UUID (foreign key)
- title, description, location, venue
- expectedFootfall: Integer
- startDate, endDate: DateTime
- status: DRAFT | PUBLISHED | CANCELLED | COMPLETED
- website, logoUrl
- verificationStatus: PENDING | VERIFIED | REJECTED
- isActive: Boolean
- createdAt, updatedAt: DateTime
```

#### Sponsorship (Company ↔ Event Link)
```
- id: UUID (primary key)
- tenantId, companyId, eventId: UUID (foreign keys)
- status: PENDING | ACTIVE | PAUSED | CANCELLED | COMPLETED
- tier: String (sponsorship level)
- notes: String
- isActive: Boolean
- createdAt, updatedAt: DateTime
- @@unique([companyId, eventId]) - one sponsorship per company-event
```

#### Proposal (Negotiation/Approval Workflow)
```
- id: UUID (primary key)
- tenantId, sponsorshipId: UUID (foreign keys)
- status: DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | WITHDRAWN
- proposedTier, proposedAmount, message, notes
- submittedAt, reviewedAt: DateTime
- isActive: Boolean
- createdAt, updatedAt: DateTime
```

#### AuditLog (Immutable Activity Log)
```
- id: UUID (primary key)
- tenantId, actorId: UUID
- actorRole: String
- action: String (e.g., "proposal.created")
- entityType, entityId: String/UUID
- metadata: JSON (old/new values)
- createdAt: DateTime
```

#### Notification
```
- id: UUID (primary key)
- tenantId, userId: UUID
- title, message: String
- severity: INFO | SUCCESS | WARNING | ERROR
- read: Boolean
- link, entityType, entityId: String
- createdAt: DateTime
```

#### EmailLog
```
- id: UUID (primary key)
- tenantId: UUID
- recipient, subject, jobName
- entityType, entityId: String/UUID
- status: SENT | FAILED
- errorMessage: String
- createdAt: DateTime
```

---

## Authentication & Authorization

### JWT Tokens
The system uses two JWT tokens stored in HTTP-only cookies:

1. **Access Token** (15 minutes)
   - Contains: user id, role, tenant_id, company_id, organizer_id
   - Used for API authorization
   - Stored in `access_token` cookie (path: `/`)

2. **Refresh Token** (7 days)
   - Used to obtain new access tokens
   - Stored in `refresh_token` cookie (path: `/auth`)
   - Stored hashed in database for revocation

### Cookie Configuration
| Environment | Domain | SameSite | Secure |
|-------------|--------|----------|--------|
| Production | `.sponsiwise.app` | `none` | `true` |
| Development | `localhost` | `lax` | `false` |

### Roles & Permissions

| Role | Description | Scope |
|------|-------------|-------|
| USER | Basic registered user | Own tenant |
| SPONSOR | Sponsor company representative | Own tenant, own company |
| ORGANIZER | Event organizer | Own tenant, own organizer |
| MANAGER | Platform manager | Own tenant |
| ADMIN | Tenant admin | Own tenant |
| SUPER_ADMIN | Platform super admin | All tenants |

### Role Hierarchy
```
SUPER_ADMIN (all access)
  └── ADMIN (tenant admin)
       └── MANAGER (tenant manager)
            └── ORGANIZER (event organizer)
                 └── SPONSOR (sponsor company)
                      └── USER (basic user)
```

### Protected Routes Pattern
```typescript
@Controller('resource')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class ResourceController {
  // ADMIN: own tenant only
  // SUPER_ADMIN: all tenants
}
```

---

## API Endpoints

### 1. Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/auth/register` | Register new user | No | - |
| POST | `/auth/login` | Login user | No | - |
| POST | `/auth/refresh` | Refresh tokens | No | - |
| POST | `/auth/logout` | Logout user | No | - |
| GET | `/auth/me` | Get current user | Yes | All |
| PATCH | `/auth/change-password` | Change password | Yes | All |

#### Request/Response Examples

**POST /auth/register**
```json
// Request Body
{
  "email": "user@example.com",
  "password": "password123"
}

// Response (201)
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "tenantId": "uuid" // yaha correction karna  hai
  }
}
```

**POST /auth/login**
```json
// Request Body
{
  "email": "user@example.com",
  "password": "password123"
}

// Response (200)
{
  "message": "Login successful",
  "user": { ... }
}
```

---

### 2. Public Endpoints (`/public`)

No authentication required. Returns only verified/public data.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/public/events` | List public events |
| GET | `/public/events/:slug` | Get event by slug |
| GET | `/public/companies` | List public companies |
| GET | `/public/companies/:slug` | Get company by slug |
| GET | `/public/stats` | Platform statistics |

#### Query Parameters

**GET /public/events**
```
?page=1&page_size=10&search=conference&location=NYC
```

**GET /public/companies**
```
?page=1&page_size=10&search=tech&type=SPONSOR
```

---

### 3. Onboarding (`/onboarding`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/onboarding/sponsor` | Register as sponsor | Yes | USER |
| POST | `/onboarding/organizer` | Register as organizer | Yes | USER |

**POST /onboarding/sponsor**
```json
// Request Body
{
  "name": "Tech Corp",
  "website": "https://techcorp.com",
  "description": "Technology company"
}

// Response (201)
{
  "message": "Sponsor registration submitted for approval",
  "company": { ... }
}
```

**POST /onboarding/organizer**
```json
// Request Body
{
  "name": "Event Pro",
  "contactEmail": "contact@eventpro.com",
  "website": "https://eventpro.com"
}

// Response (201) - Returns new tokens with ORGANIZER role
{
  "message": "Organizer registration successful",
  "organizer": { ... },
  "user": { role: "ORGANIZER", ... }
}
```

---

### 4. Users (`/users`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/users/me` | Get current user profile | Yes | All |
| GET | `/users` | List users | Yes | ADMIN, SUPER_ADMIN |
| GET | `/users/:id` | Get user by ID | Yes | ADMIN, SUPER_ADMIN |
| PATCH | `/users/:id` | Update user | Yes | ADMIN, SUPER_ADMIN |

---

### 5. Companies (`/companies`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/companies` | Create company | Yes | ADMIN, SUPER_ADMIN |
| GET | `/companies` | List companies | Yes | USER, ADMIN, SUPER_ADMIN |
| GET | `/companies/:id` | Get company by ID | Yes | USER, ADMIN, SUPER_ADMIN |
| PATCH | `/companies/:id` | Update company | Yes | ADMIN, SUPER_ADMIN |

---

### 6. Organizers (`/organizers`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/organizers` | Create organizer | Yes | ADMIN, SUPER_ADMIN |
| GET | `/organizers` | List organizers | Yes | USER, ADMIN, SUPER_ADMIN |
| GET | `/organizers/:id` | Get organizer by ID | Yes | USER, ADMIN, SUPER_ADMIN |
| PATCH | `/organizers/:id` | Update organizer | Yes | ADMIN, SUPER_ADMIN |
| DELETE | `/organizers/:id` | Soft delete organizer | Yes | ADMIN, SUPER_ADMIN |

---

### 7. Events (`/events`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/events` | Create event | Yes | ORGANIZER, ADMIN, SUPER_ADMIN |
| GET | `/events` | List events | Yes | USER, ADMIN, SUPER_ADMIN |
| GET | `/events/:id` | Get event by ID | Yes | USER, ADMIN, SUPER_ADMIN |
| PATCH | `/events/:id` | Update event | Yes | ADMIN, SUPER_ADMIN |
| DELETE | `/events/:id` | Soft delete event | Yes | ADMIN, SUPER_ADMIN |

---

### 8. Sponsorships (`/sponsorships`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/sponsorships` | Create sponsorship | Yes | ADMIN, SUPER_ADMIN |
| GET | `/sponsorships` | List sponsorships | Yes | USER, ADMIN, SUPER_ADMIN |
| GET | `/sponsorships/:id` | Get sponsorship by ID | Yes | USER, ADMIN, SUPER_ADMIN |
| PATCH | `/sponsorships/:id` | Update sponsorship | Yes | ADMIN, SUPER_ADMIN |

---

### 9. Proposals (`/proposals`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/proposals` | Create proposal | Yes | ADMIN, SUPER_ADMIN |
| GET | `/proposals` | List proposals | Yes | USER, ADMIN, SUPER_ADMIN |
| GET | `/proposals/:id` | Get proposal by ID | Yes | USER, ADMIN, SUPER_ADMIN |
| PATCH | `/proposals/:id` | Update proposal | Yes | ADMIN, SUPER_ADMIN |

---

### 10. Tenants (`/tenants`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/tenants` | Create tenant | Yes | SUPER_ADMIN |
| GET | `/tenants` | List tenants | Yes | SUPER_ADMIN |
| GET | `/tenants/:id` | Get tenant by ID | Yes | SUPER_ADMIN, Tenant Member |
| PATCH | `/tenants/:id` | Update tenant | Yes | SUPER_ADMIN |

---

### 11. Admin (`/admin`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/admin/dashboard/stats` | Dashboard stats | Yes | ADMIN, SUPER_ADMIN |
| GET | `/admin/users` | List users | Yes | ADMIN, SUPER_ADMIN |
| GET | `/admin/users/:id` | Get user by ID | Yes | ADMIN, SUPER_ADMIN |
| PATCH | `/admin/users/:id/role` | Update user role | Yes | ADMIN, SUPER_ADMIN |
| PATCH | `/admin/users/:id/status` | Update user status | Yes | ADMIN, SUPER_ADMIN |

---

### 12. Manager Dashboard (`/manager`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/manager/dashboard/stats` | Dashboard stats | Yes | MANAGER |
| GET | `/manager/companies` | List companies | Yes | MANAGER |
| GET | `/manager/companies/:id` | Get company | Yes | MANAGER |
| POST | `/manager/companies/:id/verify` | Verify company | Yes | MANAGER |
| GET | `/manager/events` | List events | Yes | MANAGER |
| GET | `/manager/events/:id` | Get event | Yes | MANAGER |
| POST | `/manager/events/:id/verify` | Verify event | Yes | MANAGER |
| GET | `/manager/activity` | Activity log | Yes | MANAGER |
| GET | `/manager/email-logs` | Email logs | Yes | MANAGER, ADMIN, SUPER_ADMIN |
| GET | `/manager/companies/:id/lifecycle` | Company lifecycle | Yes | MANAGER |
| GET | `/manager/events/:id/lifecycle` | Event lifecycle | Yes | MANAGER |

---

### 13. Organizer Dashboard (`/organizer`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/organizer/dashboard/stats` | Dashboard stats | Yes | ORGANIZER |
| POST | `/organizer/events` | Create event | Yes | ORGANIZER |
| GET | `/organizer/events` | List events | Yes | ORGANIZER |
| GET | `/organizer/events/:id` | Get event | Yes | ORGANIZER |
| GET | `/organizer/proposals` | List proposals | Yes | ORGANIZER |
| GET | `/organizer/proposals/:id` | Get proposal | Yes | ORGANIZER |
| POST | `/organizer/proposals/:id/review` | Review proposal | Yes | ORGANIZER |

---

### 14. Sponsor Dashboard (`/sponsor`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/sponsor/dashboard/stats` | Dashboard stats | Yes | SPONSOR |
| GET | `/sponsor/events` | List events | Yes | SPONSOR |
| GET | `/sponsor/events/:id` | Get event | Yes | SPONSOR |
| GET | `/sponsor/proposals` | List proposals | Yes | SPONSOR |
| GET | `/sponsor/proposals/:id` | Get proposal | Yes | SPONSOR |
| POST | `/sponsor/proposals` | Create proposal | Yes | SPONSOR |
| POST | `/sponsor/proposals/:id/withdraw` | Withdraw proposal | Yes | SPONSOR |
| GET | `/sponsor/sponsorships` | List sponsorships | Yes | SPONSOR |

---

### 15. Notifications (`/notifications`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/notifications` | List notifications | Yes | All |
| GET | `/notifications/:id` | Get notification | Yes | All |
| PATCH | `/notifications/:id/read` | Mark as read | Yes | All |
| PATCH | `/notifications/read-all` | Mark all as read | Yes | All |

---

### 16. Audit Logs (`/audit-logs`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/audit-logs` | List audit logs | Yes | MANAGER, ADMIN, SUPER_ADMIN |
| GET | `/audit-logs/entity/:entityType/:entityId` | Entity history | Yes | MANAGER, ADMIN, SUPER_ADMIN |

---

### 17. Health Check (`/health`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/health` | Health check | No | - |

Returns status of database, memory, and Redis.

---

## Frontend-Backend Communication

### Environment Variables

**Backend (.env)**
```
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NODE_ENV=development|production
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### API Client Usage

#### Client-Side (Browser)
```typescript
// sponsiwise-frontend/src/lib/api-client.ts
import { apiClient } from '@/lib/api-client';

// GET request
const users = await apiClient.get('/admin/users');

// POST request
const result = await apiClient.post('/auth/login', { 
  email: 'user@example.com', 
  password: 'password' 
});

// With credentials (cookies)
const config = { credentials: 'include' };
```

#### Server-Side (Next.js Server Components)
```typescript
// sponsiwise-frontend/src/lib/auth.ts
import { cookies } from 'next/headers';

async function getServerUser() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
  
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Cookie': cookieHeader,
    },
  });
  
  return res.json();
}
```

### Public API Client
```typescript
// sponsiwise-frontend/src/lib/public-api.ts
import { apiClient } from './api-client';

// Fetch public events
const events = await apiClient.get('/public/events?page=1');

// Fetch public companies
const companies = await apiClient.get('/public/companies');

// Fetch platform stats
const stats = await apiClient.get('/public/stats');
```

### Role-Specific API Clients

**Admin API** (`src/lib/admin-api.ts`)
- `/admin/dashboard/stats`
- `/admin/users`
- `/admin/users/:id`
- `/admin/users/:id/role`
- `/admin/users/:id/status`

**Manager API** (`src/lib/manager-api.ts`)
- `/manager/dashboard/stats`
- `/manager/companies`
- `/manager/events`
- `/manager/activity`
- `/manager/email-logs`

**Organizer API** (`src/lib/organizer-api.ts`)
- `/organizer/dashboard/stats`
- `/organizer/events`
- `/organizer/proposals`
- `/organizer/proposals/:id/review`

**Sponsor API** (`src/lib/sponsor-api.ts`)
- `/sponsor/dashboard/stats`
- `/sponsor/events`
- `/sponsor/proposals`
- `/sponsor/sponsorships`

---

## Project Structure

### Backend Structure (`sponsiwise_backend/`)

```
sponsiwise_backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed*.ts               # Seed data scripts
├── src/
│   ├── main.ts                # Application entry point
│   ├── app.module.ts          # Root module
│   ├── app.controller.ts      # Root controller
│   ├── app.service.ts         # Root service
│   ├── auth/                  # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── auth.guard.ts
│   │   ├── dto/               # Data Transfer Objects
│   │   └── interfaces/        # TypeScript interfaces
│   ├── users/                 # User management
│   ├── tenants/               # Tenant management
│   ├── companies/             # Company management
│   ├── organizers/            # Organizer management
│   ├── events/                # Event management
│   ├── sponsorships/          # Sponsorship management
│   ├── proposals/             # Proposal management
│   ├── admin/                 # Admin endpoints
│   ├── manager-dashboard/     # Manager dashboard
│   ├── organizer-dashboard/   # Organizer dashboard
│   ├── sponsor/               # Sponsor dashboard
│   ├── public/                # Public endpoints
│   ├── notifications/        # Notifications
│   ├── audit-logs/            # Audit logging
│   ├── email-logs/            # Email tracking
│   ├── health/                # Health checks
│   ├── onboarding/            # User onboarding
│   ├── manager-lifecycle/     # Manager lifecycle views
│   ├── company-lifecycle/     # Company lifecycle views
│   ├── common/                # Shared utilities
│   │   ├── config/            # Configuration
│   │   ├── guards/            # NestJS Guards
│   │   ├── decorators/        # Custom decorators
│   │   ├── filters/           # Exception filters
│   │   ├── pipes/             # Validation pipes
│   │   └── providers/         # Providers (Prisma, etc.)
│   ├── cache/                 # Redis caching
│   └── jobs/                  # BullMQ job queues
├── package.json
├── nest-cli.json
└── tsconfig.json
```

### Frontend Structure (`sponsiwise-frontend/`)

```
sponsiwise-frontend/
├── src/
│   ├── app/
│   │   ├── (public)/           # Public pages (no auth)
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── login/         # Login page
│   │   │   ├── register/     # Registration page
│   │   │   └── companies/    # Public companies
│   │   ├── (authenticated)/  # Authenticated pages
│   │   │   ├── admin/         # Admin dashboard
│   │   │   ├── manager/      # Manager dashboard
│   │   │   ├── organizer/    # Organizer dashboard
│   │   │   └── sponsor/       # Sponsor dashboard
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # UI components
│   │   ├── shared/            # Shared components
│   │   ├── admin/             # Admin components
│   │   ├── manager/           # Manager components
│   │   ├── organizer/         # Organizer components
│   │   └── sponsor/           # Sponsor components
│   ├── lib/
│   │   ├── api-client.ts      # Base API client
│   │   ├── auth.ts            # Server auth
│   │   ├── auth-fetch.ts      # Auth fetch utilities
│   │   ├── public-api.ts      # Public API client
│   │   ├── admin-api.ts       # Admin API client
│   │   ├── manager-api.ts     # Manager API client
│   │   ├── organizer-api.ts   # Organizer API client
│   │   ├── sponsor-api.ts     # Sponsor API client
│   │   ├── types/             # TypeScript types
│   │   └── route-config.ts    # Route configuration
│   └── middleware.ts          # Next.js middleware
├── public/                    # Static assets
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis

### Backend Setup
```bash
cd sponsiwise_backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database/redis credentials

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start development server
npm run start:dev
```

### Frontend Setup
```bash
cd sponsiwise-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with API URL

# Start development server
npm run dev
```

### Accessing the Application

**Development**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

**Production URLs**
- Frontend: https://sponsiwise.app
- Backend: https://api.sponsiwise.app

---

## Common API Response Formats

### Success Response (200)
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Paginated Response
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### Error Response (4xx/5xx)
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

---

## Important Notes for Developers

1. **Tenant Isolation**: Always use `user.tenant_id` from JWT to scope queries. Never trust tenant_id from request body.

2. **Role Validation**: Use `@Roles()` decorator and `RoleGuard` for all protected endpoints.

3. **Validation**: Use DTOs with class-validator for request validation.

4. **Audit Logging**: Log important actions using the AuditLog service.

5. **Cookies**: Always set `credentials: 'include'` in frontend fetch requests.

6. **Environment**: Check `NODE_ENV` and domain detection for cookie configuration.

7. **Caching**: Public endpoints are cached; authenticated data should not be cached.

---

*Last Updated: Documentation generated from codebase analysis*

