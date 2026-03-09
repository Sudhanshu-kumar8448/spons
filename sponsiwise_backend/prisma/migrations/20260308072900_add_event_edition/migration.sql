/*
  Warnings:

  - Added the required column `edition` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventEdition" AS ENUM ('INAUGURAL', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'TENTH', 'BI_ANNUAL', 'QUATERLY', 'OTHER');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "edition" "EventEdition" NOT NULL;
