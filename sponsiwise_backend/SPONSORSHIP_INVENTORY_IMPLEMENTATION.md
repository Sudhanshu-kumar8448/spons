# Sponsorship Inventory System - Implementation Specification
remember i have one tenenant only you have to work like that only .that is global tenenant and all the user should be in the global tenenat

## Overview
This document provides a complete implementation plan for the sponsorship inventory system with limited sponsorship slots, tier locking, and new workflow.

---

## 1️⃣ Updated Prisma Schema

### New Enums
```prisma
// Event Status - Extended for new workflow
enum EventStatus {
  DRAFT
  UNDER_MANAGER_REVIEW
  VERIFIED
  REJECTED
  PUBLISHED
  CANCELLED
  COMPLETED
}

// Proposal Status - Extended for new workflow
enum ProposalStatus {
  DRAFT
  SUBMITTED
  UNDER_MANAGER_REVIEW
  FORWARDED_TO_ORGANIZER
  APPROVED
  REJECTED
  REQUEST_CHANGES
  WITHDRAWN
}

// Sponsorship Tier Type
enum TierType {
  TITLE
  PRESENTING
  POWERED_BY
  GOLD
  SILVER
}
```

### SponsorshipTier Model (New)
```prisma
model SponsorshipTier {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @map("tenant_id") @db.Uuid
  eventId       String    @map("event_id") @db.Uuid
  tierType      TierType
  askingPrice   Decimal   @map("asking_price") @db.Decimal(12, 2)
  totalSlots    Int       @default(1) @map("total_slots")
  soldSlots     Int       @default(0) @map("sold_slots")
  isLocked      Boolean   @default(false) @map("is_locked")
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  tenant     Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  event      Event      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  proposals  Proposal[]

  // Indexes
  @@index([tenantId])
  @@index([eventId])
  @@index([tenantId, eventId])
  @@unique([eventId, tierType])
  @@map("sponsorship_tiers")
}
```

### Address Model (New)
```prisma
model Address {
  id         String  @id @default(uuid()) @db.Uuid
  tenantId   String @map("tenant_id") @db.Uuid
  eventId    String @map("event_id") @db.Uuid
  addressLine1 String @map("address_line_1") @db.VarChar(255)
  addressLine2 String? @map("address_line_2") @db.VarChar(255)
  city       String @db.VarChar(100)
  state      String @db.VarChar(100)
  country    String @db.VarChar(100)
  postalCode String @map("postal_code") @db.VarChar(20)
  
  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  event  Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([eventId])
  @@map("addresses")
}
```

### Event Model (Updated)
```prisma
model Event {
  // ... existing fields ...
  
  // New fields
  category        String?  @db.VarChar(100)
  pptDeckUrl      String?  @map("ppt_deck_url") @db.VarChar(500)
  contactPhone    String?  @map("contact_phone") @db.VarChar(50)
  
  // Relations - Add new
  tiers     SponsorshipTier[]
  address   Address?

  // Status enum updated - remove old indexes if needed
  @@map("events")
}
```

### Proposal Model (Updated)
```prisma
model Proposal {
  // ... existing fields ...
  
  // New field - tier reference
  tierId    String? @map("tier_id") @db.Uuid

  // Relations - Add new
  tier      SponsorshipTier? @relation(fields: [tierId], references: [id], onDelete: SetNull)

  // Remove unique if needed, update indexes
  @@index([tierId])
  @@index([status])
  @@map("proposals")
}
```

---

## 2️⃣ Relational Diagram

```
Tenant (1)
    │
    ├── User
    │     ├── refreshTokens
    │     └── notifications
    │
    ├── Company
    │     └── sponsorships
    │
    ├── Organizer
    │     └── events (1:N)
    │
    ├── Event (1)
    │     ├── address (1:1) ← NEW
    │     ├── sponsorshipTiers (1:N) ← NEW
    │     └── sponsorships (1:N)
    │           └── proposals (1:N)
    │                 └── tier (N:1) ← NEW
    │
    ├── AuditLog
    ├── EmailLog
    └── Notification
```

---

## 3️⃣ State Transition Diagrams

### Event Workflow
```
┌─────────────┐
│   DRAFT     │ ← Organizer creates
└──────┬──────┘
       │ Submit for Review
       ▼
┌────────────────────────┐
│ UNDER_MANAGER_REVIEW  │ ← Manager reviews/edits
└──────┬────────────────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌────────┐
│REJECT│ │APPROVE │ ──→ Lock all tiers, Event visible
└──────┘ └────────┘
             │
             ▼
        ┌──────────┐
        │ VERIFIED │ ──→ Sponsors can view
        └────┬─────┘
             │
             ▼ (Organizer publishes)
        ┌───────────┐
        │ PUBLISHED │
        └───────────┘
```

### Proposal Workflow
```
┌─────────────┐
│   DRAFT     │ ← Sponsor creates
└──────┬──────┘
       │ Submit
       ▼
┌─────────────┐
│  SUBMITTED  │ ← Manager reviews
└──────┬──────┘
       │ Forward
       ▼
┌─────────────────────┐
│ FORWARDED_TO_      │ ← Organizer reviews
│    ORGANIZER        │
└──────┬─────────────┘
       │
   ┌───┴────────────┐
   │                │
   ▼                ▼
┌────────┐    ┌─────────────┐
│APPROVE │    │  REQUEST   │ ← Organizer requests changes
└───┬────┘    │  _CHANGES  │
    │         └──────┬──────┘
    │                │ Resubmit
    │                ▼
    │         ┌─────────────┐
    │         │  SUBMITTED  │
    │         └──────┬──────┘
    │                │
    └────────┬───────┘
             │ Reject
             ▼
        ┌──────────┐
        │ REJECTED  │
        └───────────┘

   ┌─────────────┐
   │ APPROVED    │ ──→ Increment soldSlots, Notify Sponsor
   └─────────────┘
```

---

## 4️⃣ Service-Layer Architecture

### Event Creation Transaction
```typescript
async createEventWithTiers(dto: CreateEventDto, organizerId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Create Event
    const event = await tx.event.create({
      data: {
        ...eventData,
        status: EventStatus.UNDER_MANAGER_REVIEW,
        // ...
      }
    });

    // 2. Create Address
    if (dto.address) {
      await tx.address.create({
        data: {
          ...dto.address,
          tenantId: GLOBAL_TENANT_ID,
          eventId: event.id
        }
      });
    }

    // 3. Create Sponsorship Tiers
    if (dto.tiers?.length) {
      for (const tier of dto.tiers) {
        await tx.sponsorshipTier.create({
          data: {
            tenantId: GLOBAL_TENANT_ID,
            eventId: event.id,
            tierType: tier.tierType,
            askingPrice: tier.askingPrice,
            totalSlots: tier.totalSlots || 1,
            soldSlots: 0,
            isLocked: false
          }
        });
      }
    }

    // 4. Create Audit Log
    await tx.auditLog.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        actorId: organizerId,
        actorRole: 'ORGANIZER',
        action: 'event.created',
        entityType: 'Event',
        entityId: event.id,
        metadata: { status: EventStatus.UNDER_MANAGER_REVIEW }
      }
    });

    return event;
  });
}
```

### Tier Lock/Unlock Logic
```typescript
async lockTiersForEvent(eventId: string, managerId: string) {
  const result = await this.prisma.$transaction(async (tx) => {
    // Lock all tiers
    const tiers = await tx.sponsorshipTier.updateMany({
      where: { eventId },
      data: { isLocked: true }
    });

    // Update event status
    const event = await tx.event.update({
      where: { id: eventId },
      data: { 
        status: EventStatus.VERIFIED,
        verificationStatus: VerificationStatus.VERIFIED
      }
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        tenantId: GLOBAL_TENANT_ID,
        actorId: managerId,
        actorRole: 'MANAGER',
        action: 'tiers.locked',
        entityType: 'Event',
        entityId: eventId,
        metadata: { tierCount: tiers.count }
      }
    });

    return event;
  });

  // Emit notifications
  this.eventEmitter.emit('event.verified', { eventId, ... });

  return result;
}
```

### Atomic Slot Increment (Race Condition Prevention)
```typescript
async incrementSoldSlots(tierId: string) {
  // Use optimistic locking with version field or use raw SQL
  // Option 1: Database-level atomic increment
  const result = await this.prisma.$executeRaw`
    UPDATE "sponsorship_tiers" 
    SET "sold_slots" = "sold_slots" + 1,
        "updated_at" = NOW()
    WHERE id = ${tierId}
      AND "sold_slots" < "total_slots"
      AND "is_locked" = true
  `;

  if (result === 0) {
    throw new BadRequestException('Tier is full or not available');
  }

  // Option 2: Transaction with check
  return this.prisma.$transaction(async (tx) => {
    const tier = await tx.sponsorshipTier.findUnique({
      where: { id: tierId }
    });

    if (!tier || !tier.isLocked || tier.soldSlots >= tier.totalSlots) {
      throw new BadRequestException('Tier is not available');
    }

    return tx.sponsorshipTier.update({
      where: { id: tierId },
      data: { soldSlots: { increment: 1 } }
    });
  });
}
```

---

## 5️⃣ Notification Trigger Matrix

| Trigger | Actor | Recipient | Severity | Title |
|---------|-------|----------|----------|-------|
| Event Created | Organizer | Manager | INFO | New event submitted for review |
| Event Approved | Manager | Organizer | SUCCESS | Your event has been approved |
| Event Rejected | Manager | Organizer | ERROR | Your event has been rejected |
| Event Verified | Manager | Sponsor (all) | INFO | New event available for sponsorship |
| Proposal Submitted | Sponsor | Manager | INFO | New proposal received |
| Proposal Forwarded | Manager | Organizer | INFO | New proposal to review |
| Proposal Approved | Organizer | Sponsor | SUCCESS | Your proposal has been accepted |
| Proposal Rejected | Organizer | Sponsor | ERROR | Your proposal has been declined |
| Proposal Request Changes | Organizer | Sponsor | WARNING | Changes requested for proposal |
| Tier Sold Out | System | Organizer | WARNING | Sponsorship tier fully booked |

---

## 6️⃣ Audit Log Trigger Matrix

| Action | Entity | Actor | Metadata |
|--------|--------|-------|----------|
| event.created | Event | Organizer | { status, title } |
| event.submitted | Event | Organizer | { status: UNDER_MANAGER_REVIEW } |
| event.status_changed | Event | Manager | { oldStatus, newStatus } |
| event.approved | Event | Manager | { decision } |
| event.rejected | Event | Manager | { decision, notes } |
| tiers.locked | Event | Manager | { tierCount } |
| tiers.unlocked | Event | Manager | { tierCount } |
| tier.created | SponsorshipTier | Organizer | { tierType, price, slots } |
| tier.updated | SponsorshipTier | Organizer/Manager | { changes } |
| tier.slot_sold | SponsorshipTier | System | { soldSlots, totalSlots } |
| proposal.created | Proposal | Sponsor | { sponsorshipId } |
| proposal.submitted | Proposal | Sponsor | { status } |
| proposal.status_changed | Proposal | Any | { oldStatus, newStatus } |
| proposal.approved | Proposal | Organizer | { tierId, amount } |
| proposal.rejected | Proposal | Organizer | { reason } |

---

## 7️⃣ Role Authority Definition

| Action | MANAGER | ORGANIZER | SPONSOR | USER |
|--------||---------|-----------|---------|------|
| Create Event | ❌ | ✅ | ❌ | ❌ |
| Edit Event (Draft) | ✅ | ✅ (own) | ❌ | ❌ |
| Edit Event (Locked)  | ✅ | ❌ | ❌ | ❌ |
| Delete Event  | ✅ | ❌ | ❌ | ❌ |
| Approve Event | ✅ | ❌ | ❌ | ❌ |
| Reject Event | ✅ | ❌ | ❌ | ❌ |
| View Verified Events | ✅ | ✅ | ✅ | ✅ |
| Create Tiers | ✅ | ✅ (own, unlocked) | ❌ | ❌ |
| Edit Tiers (Unlocked) | ✅ | ✅ (own) | ❌ | ❌ |
| Edit Tiers (Locked) | ✅ | ❌ | ❌ | ❌ |
| Unlock Tiers | ✅ | ❌ | ❌ | ❌ |
| Submit Proposal | ✅ | ❌ | ✅ | ❌ |
| Edit Own Proposal | ✅ | ❌ | ✅ (draft) | ❌ |
| Approve Proposal | ✅ | ✅ (own event) | ❌ | ❌ |
| Reject Proposal | ✅ | ✅ (own event) | ❌ | ❌ |

---

## 8️⃣ Validation Rules (class-validator)

### CreateEventDto
```typescript
export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  pptDeckUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  // Nested address
  @ValidateNested()
  @IsOptional()
  @Type(() => AddressDto)
  address?: AddressDto;

  // Tiers
  @ValidateNested({ each: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => SponsorshipTierDto)
  tiers?: SponsorshipTierDto[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  expectedFootfall?: number;
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;
}

export class SponsorshipTierDto {
  @IsEnum(TierType)
  tierType: TierType;

  @IsNumber()
  @Min(0)
  askingPrice: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  totalSlots?: number = 1;
}
```

### SubmitProposalDto
```typescript
export class SubmitProposalDto {
  @IsString()
  @IsNotEmpty()
  sponsorshipId: string;

  @IsString()
  @IsNotEmpty()
  tierId: string;

  @IsNumber()
  @Min(0)
  proposedAmount: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}
```

---

## 9️⃣ Migration Safe Strategy

### Step 1: Add New Tables (Non-Breaking)
```sql
-- Run as migration 001
CREATE TYPE "TierType" AS ENUM ('TITLE', 'PRESENTING', 'POWERED_BY', 'GOLD', 'SILVER');

CREATE TABLE "sponsorship_tiers" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"(id) ON DELETE CASCADE,
  "event_id" UUID NOT NULL REFERENCES "events"(id) ON DELETE CASCADE,
  "tier_type" "TierType" NOT NULL,
  "asking_price" DECIMAL(12,2) NOT NULL,
  "total_slots" INT NOT NULL DEFAULT 1,
  "sold_slots" INT NOT NULL DEFAULT 0,
  "is_locked" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("event_id", "tier_type")
);

CREATE TABLE "addresses" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"(id) ON DELETE CASCADE,
  "event_id" UUID NOT NULL REFERENCES "events"(id) ON DELETE CASCADE,
  "address_line_1" VARCHAR(255) NOT NULL,
  "address_line_2" VARCHAR(255),
  "city" VARCHAR(100) NOT NULL,
  "state" VARCHAR(100) NOT NULL,
  "country" VARCHAR(100) NOT NULL,
  "postal_code" VARCHAR(20) NOT NULL
);

-- Add new columns to events (nullable first)
ALTER TABLE "events" ADD COLUMN "category" VARCHAR(100);
ALTER TABLE "events" ADD COLUMN "ppt_deck_url" VARCHAR(500);
ALTER TABLE "events" ADD COLUMN "contact_phone" VARCHAR(50);

-- Add tier_id to proposals (nullable first)
ALTER TABLE "proposals" ADD COLUMN "tier_id" UUID REFERENCES "sponsorship_tiers"(id) ON DELETE SET NULL;

-- Update enum values
ALTER TYPE "EventStatus" ADD VALUE 'UNDER_MANAGER_REVIEW';
ALTER TYPE "EventStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "ProposalStatus" ADD VALUE 'FORWARDED_TO_ORGANIZER';
ALTER TYPE "ProposalStatus" ADD VALUE 'REQUEST_CHANGES';
```

### Step 2: Backfill Data (If needed)
```sql
-- Create default tiers for existing events (optional migration)
```

### Step 3: Make Columns Not Nullable
```sql
-- After validating data
ALTER TABLE "events" ALTER COLUMN "category" SET NOT NULL; -- if required
```

---

## 🔟 Security Considerations

### 1. Prevent Sponsor Manipulating Price
```typescript
// In Proposal Service - never accept price from sponsor
async createProposal(dto: CreateProposalDto, sponsorId: string) {
  // Validate tier exists and is locked
  const tier = await this.validateTierForProposal(dto.tierId);
  
  // NEVER allow sponsor to set price - use tier's askingPrice
  // Only allow proposedAmount (what sponsor offers)
  
  // Check availability
  if (tier.soldSlots >= tier.totalSlots) {
    throw new BadRequestException('This tier is fully booked');
  }
}
```

### 2. Prevent Organizer Editing Locked Tiers
```typescript
async updateTier(tierId: string, dto: UpdateTierDto, callerId: string, role: Role) {
  const tier = await this.prisma.sponsorshipTier.findUnique({
    where: { id: tierId },
    include: { event: true }
  });

  // Check if tier is locked
  if (tier.isLocked && role !== Role.ADMIN && role !== Role.MANAGER) {
    throw new ForbiddenException('Cannot edit locked tiers. Contact manager.');
  }

  // Check ownership for organizers
  if (role === Role.ORGANIZER && tier.event.organizerId !== organizerId) {
    throw new ForbiddenException('Cannot edit tiers for other organizers events');
  }
}
```

### 3. Cross-Tenant Access Protection
```typescript
// Always filter by tenant in queries
async findTiersByEvent(eventId: string, tenantId: string) {
  return this.prisma.sponsorshipTier.findMany({
    where: {
      eventId,
      tenantId, // Always include tenant filter
      isActive: true
    }
  });
}
```

### 4. Race Condition Protection
```typescript
// Use database-level atomic operations
async incrementSlot(tierId: string) {
  const result = await this.prisma.$executeRaw`
    UPDATE sponsorship_tiers 
    SET sold_slots = sold_slots + 1,
        updated_at = NOW()
    WHERE id = ${tierId}
      AND is_locked = true
      AND sold_slots < total_slots
  `;
  
  if (result === 0) {
    throw new BadRequestException('Tier is not available');
  }
}
```

### 5. Server-Side Tier Availability Checks
```typescript
// Always validate on server side - never trust client
async getAvailableTiersForSponsor(eventId: string) {
  return this.prisma.sponsorshipTier.findMany({
    where: {
      eventId,
      isActive: true,
      isLocked: true, // Only show locked tiers to sponsors
      soldSlots: { lt: Prisma.raw('total_slots') }
    },
    orderBy: { askingPrice: 'desc' }
  });
}
```

---

## 1️⃣1️⃣ Sponsor Dashboard Filtering Query

### Get Available Events for Sponsors
```typescript
async findAvailableForSponsors(tenantId: string) {
  // Only show events that:
  // 1. Are verified/published
  // 2. Have at least one available tier
  // 3. Have at least one unlocked tier
  
  return this.prisma.event.findMany({
    where: {
      tenantId,
      status: { in: [EventStatus.VERIFIED, EventStatus.PUBLISHED] },
      isActive: true,
      // At least one tier has availability
      tiers: {
        some: {
          isActive: true,
          isLocked: true,
          soldSlots: { lt: Prisma.raw('total_slots') }
        }
      }
    },
    include: {
      organizer: true,
      tiers: {
        where: {
          isActive: true,
          isLocked: true,
          soldSlots: { lt: Prisma.raw('total_slots') }
        },
        orderBy: { askingPrice: 'desc' }
      }
    },
    orderBy: { startDate: 'asc' }
  });
}
```

### Get Available Tiers for an Event
```typescript
async getAvailableTiers(eventId: string) {
  return this.prisma.sponsorshipTier.findMany({
    where: {
      eventId,
      isActive: true,
      isLocked: true,
      soldSlots: { lt: Prisma.raw('total_slots') }
    },
    orderBy: { askingPrice: 'desc' }
  });
}
```

---

## 1️⃣2️⃣ Scalable Architecture Recommendations

### 1. Module Structure
```
src/
├── sponsorship-tiers/
│   ├── dto/
│   │   ├── create-tier.dto.ts
│   │   ├── update-tier.dto.ts
│   │   └── index.ts
│   ├── entities/
│   │   └── sponsorship-tier.entity.ts
│   ├── sponsorship-tiers.controller.ts
│   ├── sponsorship-tiers.module.ts
│   └── sponsorship-tiers.service.ts
│
├── addresses/
│   ├── dto/
│   ├── entities/
│   ├── addresses.controller.ts
│   ├── addresses.module.ts
│   └── addresses.service.ts
```

### 2. Service Layer Pattern
```typescript
// Use dedicated services for each domain
// EventService - handles event CRUD and tier management
// ProposalService - handles proposal workflow with tier validation
// SponsorshipTierService - handles tier inventory management
// NotificationService - handles all notifications
```

### 3. Use Transactions for Atomic Operations
```typescript
// Always use transactions for multi-table operations
async approveProposal(proposalId: string, organizerId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Update proposal status
    // 2. Create/update sponsorship
    // 3. Increment tier soldSlots
    // 4. Create audit log
    // 5. Create notification
  });
}
```

### 4. Caching Strategy
```typescript
// Cache available events for sponsors with short TTL
const CACHE_TTL = 60; // 1 minute

// Invalidate on:
// - Event status change
// - Tier lock/unlock
// - Slot increment
```

### 5. File Upload (MinIO/S3)
```typescript
// For PPT Deck upload
// Use @aws-sdk/client-s3 with MinIO endpoint

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT, // http://localhost:9000
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

const uploadPptDeck = async (file: Buffer, eventId: string) => {
  const key = `events/${eventId}/ppt-deck/${Date.now()}.pptx`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }));
  
  return `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
};
```

---

## Summary

This implementation provides:
- ✅ Complete sponsorship inventory management
- ✅ Limited slot tracking with atomic increments
- ✅ Tier locking mechanism
- ✅ New event/proposal workflow
- ✅ Comprehensive audit logging
- ✅ Notification system
- ✅ Security at every layer
- ✅ Sponsor-friendly dashboard filtering
- ✅ Scalable architecture

