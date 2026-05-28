/*
  Warnings:

  - The values [NEW] on the enum `EnquiryStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `consultantStats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `counsellorStats` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `applicants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leadSourceType` to the `enquiryForms` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeadSourceType" AS ENUM ('SYSTEM_ASSIGNED', 'OWN_GENERATED');

-- AlterEnum
BEGIN;
CREATE TYPE "EnquiryStatus_new" AS ENUM ('ASSIGNED', 'CONTACTED', 'CLOSED');
ALTER TABLE "public"."enquiryForms" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "enquiryForms" ALTER COLUMN "status" TYPE "EnquiryStatus_new" USING ("status"::text::"EnquiryStatus_new");
ALTER TYPE "EnquiryStatus" RENAME TO "EnquiryStatus_old";
ALTER TYPE "EnquiryStatus_new" RENAME TO "EnquiryStatus";
DROP TYPE "public"."EnquiryStatus_old";
ALTER TABLE "enquiryForms" ALTER COLUMN "status" SET DEFAULT 'ASSIGNED';
COMMIT;

-- DropForeignKey
ALTER TABLE "consultantStats" DROP CONSTRAINT "consultantStats_consultantId_fkey";

-- DropForeignKey
ALTER TABLE "counsellorStats" DROP CONSTRAINT "counsellorStats_counsellorId_fkey";

-- AlterTable
ALTER TABLE "applicants" ADD COLUMN     "role" TEXT DEFAULT 'Applicant',
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "enquiryForms" ADD COLUMN     "leadSourceType" "LeadSourceType" NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ASSIGNED';

-- DropTable
DROP TABLE "consultantStats";

-- DropTable
DROP TABLE "counsellorStats";

-- CreateTable
CREATE TABLE "counsellorPerformances" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "counsellorId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "systemAssignedLeads" INTEGER NOT NULL DEFAULT 0,
    "systemClosedLeads" INTEGER NOT NULL DEFAULT 0,
    "systemAdmittedStudents" INTEGER NOT NULL DEFAULT 0,
    "systemNotAdmittedStudents" INTEGER NOT NULL DEFAULT 0,
    "ownGeneratedLeads" INTEGER NOT NULL DEFAULT 0,
    "ownClosedLeads" INTEGER NOT NULL DEFAULT 0,
    "ownAdmittedStudents" INTEGER NOT NULL DEFAULT 0,
    "ownNotAdmittedStudents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counsellorPerformances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultantPerformances" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "systemAssignedLeads" INTEGER NOT NULL DEFAULT 0,
    "systemClosedLeads" INTEGER NOT NULL DEFAULT 0,
    "systemAdmittedStudents" INTEGER NOT NULL DEFAULT 0,
    "systemNotAdmittedStudents" INTEGER NOT NULL DEFAULT 0,
    "ownGeneratedLeads" INTEGER NOT NULL DEFAULT 0,
    "ownClosedLeads" INTEGER NOT NULL DEFAULT 0,
    "ownAdmittedStudents" INTEGER NOT NULL DEFAULT 0,
    "ownNotAdmittedStudents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultantPerformances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "counsellorPerformances_counsellorId_month_year_key" ON "counsellorPerformances"("counsellorId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "consultantPerformances_consultantId_month_year_key" ON "consultantPerformances"("consultantId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "applicants_userId_key" ON "applicants"("userId");

-- AddForeignKey
ALTER TABLE "counsellorPerformances" ADD CONSTRAINT "counsellorPerformances_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counsellorPerformances" ADD CONSTRAINT "counsellorPerformances_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "admissionCounsellors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultantPerformances" ADD CONSTRAINT "consultantPerformances_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultantPerformances" ADD CONSTRAINT "consultantPerformances_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "admissionConsultants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
