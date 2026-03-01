/*
  Warnings:

  - You are about to drop the column `description` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `contact_email` on the `organizers` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `organizers` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrganizerApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "description",
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" UUID,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "strategicIntent" TEXT;

-- AlterTable
ALTER TABLE "organizers" DROP COLUMN "contact_email",
DROP COLUMN "description",
ADD COLUMN     "pastRecords" TEXT,
ADD COLUMN     "social_links" JSONB,
ADD COLUMN     "tax_id" VARCHAR(100);

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "manager_review_note" TEXT,
ADD COLUMN     "organizer_approval_status" "OrganizerApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "organizer_approved_at" TIMESTAMP(3),
ADD COLUMN     "organizer_approved_by_id" UUID,
ADD COLUMN     "organizer_rejection_note" TEXT,
ADD COLUMN     "reviewed_by_id" UUID,
ADD COLUMN     "reviewed_by_role" "Role";

-- CreateTable
CREATE TABLE "proposal_messages" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sender_role" "Role" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposal_messages_proposal_id_idx" ON "proposal_messages"("proposal_id");

-- CreateIndex
CREATE INDEX "proposal_messages_sender_id_idx" ON "proposal_messages"("sender_id");

-- CreateIndex
CREATE INDEX "companies_approved_by_id_idx" ON "companies"("approved_by_id");

-- CreateIndex
CREATE INDEX "events_approved_by_id_idx" ON "events"("approved_by_id");

-- CreateIndex
CREATE INDEX "proposals_reviewed_by_id_idx" ON "proposals"("reviewed_by_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organizer_approved_by_id_fkey" FOREIGN KEY ("organizer_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_messages" ADD CONSTRAINT "proposal_messages_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_messages" ADD CONSTRAINT "proposal_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
