-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'SPONSOR', 'ORGANIZER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('TECHNOLOGY', 'MUSIC_ENTERTAINMENT', 'BUSINESS', 'EDUCATION', 'SPORTS', 'CULTURAL', 'ART_CREATIVE', 'LIFESTYLE', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('TECHNOLOGY', 'FINANCE', 'FMCG', 'HEALTHCARE_PHARMA', 'RETAIL_ECOMMERCE', 'MANUFACTURING_INDUSTRIAL', 'MEDIA_ENTERTAINMENT', 'EDUCATION', 'ENERGY_UTILITIES', 'REAL_ESTATE_CONSTRUCTION', 'LOGISTICS_TRANSPORTATION', 'TELECOM', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizerType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'NON_PROFIT', 'GOVERNMENT', 'EDUCATIONAL_INSTITUTION', 'CLUB_SOCIETY', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'UNDER_MANAGER_REVIEW', 'VERIFIED', 'REJECTED', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_MANAGER_REVIEW', 'FORWARDED_TO_ORGANIZER', 'APPROVED', 'REJECTED', 'REQUEST_CHANGES', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "OrganizerApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TierType" AS ENUM ('TITLE', 'PLATINUM', 'PRESENTING', 'POWERED_BY', 'GOLD', 'SILVER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GenderType" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AgeBracket" AS ENUM ('AGE_5_12', 'AGE_12_17', 'AGE_17_28', 'AGE_28_45', 'AGE_45_PLUS');

-- CreateEnum
CREATE TYPE "IncomeBracket" AS ENUM ('BELOW_2L', 'BETWEEN_2L_5L', 'BETWEEN_5L_10L', 'BETWEEN_10L_25L', 'ABOVE_25L');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "organizer_id" UUID,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "type" "CompanyType" NOT NULL,
    "website" VARCHAR(500),
    "strategicIntent" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "OrganizerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "pastRecords" TEXT,
    "social_links" JSONB,
    "tax_id" VARCHAR(100),
    "contact_phone" VARCHAR(50),
    "website" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organizer_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "expected_footfall" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "website" VARCHAR(500),
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category" "EventCategory" NOT NULL,
    "ppt_deck_url" VARCHAR(500),
    "contact_phone" VARCHAR(50),
    "contact_email" VARCHAR(255),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
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
    "event_id" UUID NOT NULL,
    "tierType" "TierType" NOT NULL,
    "custom_name" VARCHAR(255),
    "asking_price" DECIMAL(12,2) NOT NULL,
    "total_slots" INTEGER NOT NULL DEFAULT 1,
    "sold_slots" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "benefits" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorship_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_audience_profiles" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_audience_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_genders" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "gender" "GenderType" NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "audience_genders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_age_groups" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "bracket" "AgeBracket" NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "audience_age_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_income_groups" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "bracket" "IncomeBracket" NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "audience_income_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_regions" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "audience_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorships" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'PENDING',
    "tier" VARCHAR(100),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "sponsorship_id" UUID NOT NULL,
    "tier_id" UUID,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "proposed_tier" VARCHAR(100),
    "proposed_amount" DECIMAL(12,2),
    "message" TEXT,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "reviewed_by_role" "Role",
    "manager_review_note" TEXT,
    "organizer_approval_status" "OrganizerApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "organizer_approved_by_id" UUID,
    "organizer_approved_at" TIMESTAMP(3),
    "organizer_rejection_note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "job_name" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "status" "EmailStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" VARCHAR(512),
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_organizer_id_idx" ON "users"("organizer_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_type_idx" ON "companies"("type");

-- CreateIndex
CREATE INDEX "companies_verification_status_idx" ON "companies"("verification_status");

-- CreateIndex
CREATE INDEX "companies_slug_idx" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_approved_by_id_idx" ON "companies"("approved_by_id");

-- CreateIndex
CREATE INDEX "organizers_is_active_idx" ON "organizers"("is_active");

-- CreateIndex
CREATE INDEX "organizers_type_idx" ON "organizers"("type");

-- CreateIndex
CREATE INDEX "events_organizer_id_idx" ON "events"("organizer_id");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_organizer_id_status_idx" ON "events"("organizer_id", "status");

-- CreateIndex
CREATE INDEX "events_verification_status_idx" ON "events"("verification_status");

-- CreateIndex
CREATE INDEX "events_is_active_status_verification_status_idx" ON "events"("is_active", "status", "verification_status");

-- CreateIndex
CREATE INDEX "events_approved_by_id_idx" ON "events"("approved_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_event_id_key" ON "addresses"("event_id");

-- CreateIndex
CREATE INDEX "sponsorship_tiers_event_id_idx" ON "sponsorship_tiers"("event_id");

-- CreateIndex
CREATE INDEX "sponsorship_tiers_is_locked_idx" ON "sponsorship_tiers"("is_locked");

-- CreateIndex
CREATE INDEX "sponsorship_tiers_tierType_idx" ON "sponsorship_tiers"("tierType");

-- CreateIndex
CREATE UNIQUE INDEX "event_audience_profiles_event_id_key" ON "event_audience_profiles"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "audience_genders_profile_id_gender_key" ON "audience_genders"("profile_id", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "audience_age_groups_profile_id_bracket_key" ON "audience_age_groups"("profile_id", "bracket");

-- CreateIndex
CREATE UNIQUE INDEX "audience_income_groups_profile_id_bracket_key" ON "audience_income_groups"("profile_id", "bracket");

-- CreateIndex
CREATE INDEX "audience_regions_profile_id_idx" ON "audience_regions"("profile_id");

-- CreateIndex
CREATE INDEX "sponsorships_company_id_idx" ON "sponsorships"("company_id");

-- CreateIndex
CREATE INDEX "sponsorships_event_id_idx" ON "sponsorships"("event_id");

-- CreateIndex
CREATE INDEX "sponsorships_status_idx" ON "sponsorships"("status");

-- CreateIndex
CREATE INDEX "sponsorships_is_active_idx" ON "sponsorships"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorships_company_id_event_id_key" ON "sponsorships"("company_id", "event_id");

-- CreateIndex
CREATE INDEX "proposals_sponsorship_id_idx" ON "proposals"("sponsorship_id");

-- CreateIndex
CREATE INDEX "proposals_tier_id_idx" ON "proposals"("tier_id");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");

-- CreateIndex
CREATE INDEX "proposals_sponsorship_id_status_idx" ON "proposals"("sponsorship_id", "status");

-- CreateIndex
CREATE INDEX "proposals_reviewed_by_id_idx" ON "proposals"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "proposal_messages_proposal_id_idx" ON "proposal_messages"("proposal_id");

-- CreateIndex
CREATE INDEX "proposal_messages_sender_id_idx" ON "proposal_messages"("sender_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "email_logs_job_name_idx" ON "email_logs"("job_name");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_tiers" ADD CONSTRAINT "sponsorship_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_audience_profiles" ADD CONSTRAINT "event_audience_profiles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_genders" ADD CONSTRAINT "audience_genders_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "event_audience_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_age_groups" ADD CONSTRAINT "audience_age_groups_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "event_audience_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_income_groups" ADD CONSTRAINT "audience_income_groups_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "event_audience_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_regions" ADD CONSTRAINT "audience_regions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "event_audience_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_sponsorship_id_fkey" FOREIGN KEY ("sponsorship_id") REFERENCES "sponsorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "sponsorship_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organizer_approved_by_id_fkey" FOREIGN KEY ("organizer_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_messages" ADD CONSTRAINT "proposal_messages_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_messages" ADD CONSTRAINT "proposal_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
