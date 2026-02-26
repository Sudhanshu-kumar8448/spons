# Implementation TODO - Sponsorship Inventory System

## Step 1: Add PLATINUM to Prisma TierType enum
- [ ] Update `sponsiwise_backend/prisma/schema.prisma` - Add PLATINUM to TierType enum
- [ ] Update `sponsiwise-frontend/src/lib/types/manager.ts` - Add PLATINUM to TierType

## Step 2: Update Sponsor Service - Event Filtering with Available Tiers
- [ ] Update `sponsiwise_backend/src/sponsor/sponsor.service.ts`
  - [ ] `getEvents()` - Filter events with available tiers, include tier data
  - [ ] `getEventById()` - Include available tier data
  - [ ] `createProposal()` - Validate tier availability (tierId, isLocked, soldSlots < totalSlots)

## Step 3: Add Atomic Slot Increment on Proposal Approval
- [ ] Update `sponsiwise_backend/src/organizer-dashboard/organizer-dashboard.service.ts`
  - [ ] `reviewProposal()` - Atomic soldSlots increment on APPROVED, audit log

## Step 4: Frontend - Fix CreateEventForm PPT Upload
- [ ] Update `sponsiwise-frontend/src/components/organizer/CreateEventForm.tsx`
  - [ ] Integrate presigned URL flow for PPT upload

## Step 5: Frontend - Update Sponsor Types
- [ ] Update `sponsiwise-frontend/src/lib/types/sponsor.ts` - Add tier data

## Step 6: Create Prisma Migration
- [ ] Run prisma migration for PLATINUM enum addition

## Step 7: Verify Build
- [ ] Backend compiles
- [ ] Frontend compiles
