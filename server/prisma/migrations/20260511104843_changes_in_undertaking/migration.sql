/*
  Warnings:

  - The values [PARENT_ADMISSION_UNDERTAKING_PENDING] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `parentAccepted` on the `studentAdmissionUndertakings` table. All the data in the column will be lost.
  - You are about to drop the column `parentAcceptedAt` on the `studentAdmissionUndertakings` table. All the data in the column will be lost.
  - You are about to drop the column `parentSignature` on the `studentAdmissionUndertakings` table. All the data in the column will be lost.
  - You are about to drop the column `studentSignature` on the `studentAdmissionUndertakings` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'APPLICATION_SUBMITTED', 'AURUM_EXAM_PENDING', 'AURUM_EXAM_PASSED', 'AURUM_EXAM_FAILED', 'DOCUMENT_VERIFICATION_PENDING', 'DOCUMENT_VERIFICATION_PASSED', 'DOCUMENT_VERIFICATION_FAILED', 'STUDENT_ADMISSION_UNDERTAKING_PENDING', 'STUDENT_ADMISSION_UNDERTAKING_SUBMITTED', 'UNDERTAKING_VERIFICATION_PENDING', 'UNDERTAKING_VERIFICATION_APPROVED', 'UNDERTAKING_VERIFICATION_REJECTED', 'ADMISSION_GRANTED', 'ADMISSION_REJECTED');
ALTER TABLE "public"."studentAdmissionApplications" ALTER COLUMN "applicationStatus" DROP DEFAULT;
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationStatus" TYPE "ApplicationStatus_new" USING ("applicationStatus"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "public"."ApplicationStatus_old";
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationStatus" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "studentAdmissionUndertakings" DROP COLUMN "parentAccepted",
DROP COLUMN "parentAcceptedAt",
DROP COLUMN "parentSignature",
DROP COLUMN "studentSignature";
