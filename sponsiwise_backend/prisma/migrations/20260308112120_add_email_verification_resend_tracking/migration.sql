-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verification_last_sent_at" TIMESTAMP(3),
ADD COLUMN     "email_verification_sent_count" INTEGER NOT NULL DEFAULT 0;
