/*
  Warnings:

  - The values [PAYMENT_PENDING,DOCUMENT_VERIFICATION_PASSED] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `state` to the `enquiryForms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'APPLICATION_FEE_DUE', 'APPLICATION_SUBMITTED', 'AURUM_EXAM_PENDING', 'AURUM_EXAM_PASSED', 'AURUM_EXAM_FAILED', 'DOCUMENT_VERIFICATION_PENDING', 'DOCUMENT_VERIFIED', 'DOCUMENT_VERIFICATION_FAILED', 'STUDENT_ADMISSION_UNDERTAKING_PENDING', 'STUDENT_ADMISSION_UNDERTAKING_SUBMITTED', 'UNDERTAKING_VERIFICATION_PENDING', 'UNDERTAKING_VERIFICATION_APPROVED', 'UNDERTAKING_VERIFICATION_REJECTED', 'ADMISSION_GRANTED', 'ADMISSION_REJECTED');
ALTER TABLE "public"."studentAdmissionApplications" ALTER COLUMN "applicationStatus" DROP DEFAULT;
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationStatus" TYPE "ApplicationStatus_new" USING ("applicationStatus"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "public"."ApplicationStatus_old";
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationStatus" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "enquiryForms" ADD COLUMN     "state" TEXT NOT NULL;
