/*
  Warnings:

  - The values [SUBMITTED] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[institutionId,levelName]` on the table `degreeLevels` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `institutionId` to the `entranceExams` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VerificationFinalStatus" AS ENUM ('DOCUMENTS_VERIFICATION_PENDING', 'DOCUMENTS_VERIFIED', 'DOCUMENTS_REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DOCUMENT_VERIFICATION_PENDING', 'DOCUMENT_VERIFIED', 'DOCUMENT_REJECTED');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('AADHAR_CARD', 'SSC_MEMO', 'INTERMEDIATE_MEMO', 'UG_MEMO', 'PG_MEMO', 'BONAFIDE_CERTIFICATE', 'TRANSFER_CERTIFICATE', 'ENTRANCE_EXAM');

-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'APPLICATION_SUBMITTED', 'AURUM_EXAM_PENDING', 'AURUM_EXAM_PASSED', 'AURUM_EXAM_FAILED', 'DOCUMENT_VERIFICATION_PENDING', 'DOCUMENT_VERIFICATION_PASSED', 'DOCUMENT_VERIFICATION_FAILED', 'ADMISSION_GRANTED', 'ADMISSION_REJECTED');
ALTER TABLE "public"."studentAdmissionApplications" ALTER COLUMN "applicationStatus" DROP DEFAULT;
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationStatus" TYPE "ApplicationStatus_new" USING ("applicationStatus"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "public"."ApplicationStatus_old";
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationStatus" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "studentEducationDetails" DROP CONSTRAINT "studentEducationDetails_studentAdmissionApplicationId_fkey";

-- AlterTable
ALTER TABLE "entranceExams" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "examLink" TEXT,
ADD COLUMN     "institutionId" TEXT NOT NULL,
ADD COLUMN     "score" INTEGER,
ALTER COLUMN "rank" DROP NOT NULL;

-- AlterTable
ALTER TABLE "studentAdmissionApplications" ADD COLUMN     "aadharCard" TEXT;

-- AlterTable
ALTER TABLE "studentEducationDetails" ALTER COLUMN "studentAdmissionApplicationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "documentVerifications" (
    "id" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "verifiedByRole" TEXT NOT NULL,
    "status" "VerificationFinalStatus" NOT NULL DEFAULT 'DOCUMENTS_VERIFICATION_PENDING',
    "remarks" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentVerifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificationItems" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "documentType" "VerificationDocumentType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'DOCUMENT_VERIFICATION_PENDING',
    "remarks" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verificationItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documentVerifications_studentAdmissionApplicationId_key" ON "documentVerifications"("studentAdmissionApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "verificationItems_verificationId_documentType_key" ON "verificationItems"("verificationId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "degreeLevels_institutionId_levelName_key" ON "degreeLevels"("institutionId", "levelName");

-- CreateIndex
CREATE INDEX "entranceExams_studentAdmissionApplicationId_idx" ON "entranceExams"("studentAdmissionApplicationId");

-- AddForeignKey
ALTER TABLE "studentEducationDetails" ADD CONSTRAINT "studentEducationDetails_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entranceExams" ADD CONSTRAINT "entranceExams_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentVerifications" ADD CONSTRAINT "documentVerifications_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentVerifications" ADD CONSTRAINT "documentVerifications_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verificationItems" ADD CONSTRAINT "verificationItems_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "documentVerifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
