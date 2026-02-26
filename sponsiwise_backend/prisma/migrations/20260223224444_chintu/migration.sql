/*
  Warnings:

  - The values [UNDER_REVIEW] on the enum `ProposalStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TierType" AS ENUM ('TITLE', 'PRESENTING', 'POWERED_BY', 'GOLD', 'SILVER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventStatus" ADD VALUE 'UNDER_MANAGER_REVIEW';
ALTER TYPE "EventStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "EventStatus" ADD VALUE 'REJECTED';

-- AlterEnum
BEGIN;
CREATE TYPE "ProposalStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_MANAGER_REVIEW', 'FORWARDED_TO_ORGANIZER', 'APPROVED', 'REJECTED', 'REQUEST_CHANGES', 'WITHDRAWN');
ALTER TABLE "public"."proposals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "proposals" ALTER COLUMN "status" TYPE "ProposalStatus_new" USING ("status"::text::"ProposalStatus_new");
ALTER TYPE "ProposalStatus" RENAME TO "ProposalStatus_old";
ALTER TYPE "ProposalStatus_new" RENAME TO "ProposalStatus";
DROP TYPE "public"."ProposalStatus_old";
ALTER TABLE "proposals" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "category" VARCHAR(100),
ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(50),
ADD COLUMN     "ppt_deck_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "tier_id" UUID;

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "address_line_1" VARCHAR(255) NOT NULL,
    "address_line_2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_tiers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "tierType" "TierType" NOT NULL,
    "asking_price" DECIMAL(12,2) NOT NULL,
    "total_slots" INTEGER NOT NULL DEFAULT 1,
    "sold_slots" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorship_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "addresses_event_id_key" ON "addresses"("event_id");

-- CreateIndex
CREATE INDEX "addresses_tenant_id_idx" ON "addresses"("tenant_id");

-- CreateIndex
CREATE INDEX "sponsorship_tiers_tenant_id_idx" ON "sponsorship_tiers"("tenant_id");

-- CreateIndex
CREATE INDEX "sponsorship_tiers_event_id_idx" ON "sponsorship_tiers"("event_id");

-- CreateIndex
CREATE INDEX "sponsorship_tiers_tenant_id_event_id_idx" ON "sponsorship_tiers"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "sponsorship_tiers_is_locked_idx" ON "sponsorship_tiers"("is_locked");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_tiers_event_id_tierType_key" ON "sponsorship_tiers"("event_id", "tierType");

-- CreateIndex
CREATE INDEX "proposals_tier_id_idx" ON "proposals"("tier_id");

-- CreateIndex
CREATE INDEX "sponsorships_tenant_id_is_active_idx" ON "sponsorships"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_tiers" ADD CONSTRAINT "sponsorship_tiers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_tiers" ADD CONSTRAINT "sponsorship_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "sponsorship_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
