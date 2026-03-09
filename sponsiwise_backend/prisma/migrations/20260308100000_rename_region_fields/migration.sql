-- Rename city -> state_or_ut and state -> country in audience_regions table
ALTER TABLE "audience_regions" RENAME COLUMN "city" TO "state_or_ut";
ALTER TABLE "audience_regions" RENAME COLUMN "state" TO "country";
