/*
  Warnings:

  - The values [DRAFT,UNDERTAKING_VERIFICATION_PENDING,UNDERTAKING_VERIFICATION_APPROVED,UNDERTAKING_VERIFICATION_REJECTED] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('SAVED_AS_DRAFT', 'APPLICATION_FEE_DUE', 'APPLICATION_SUBMITTED', 'AURUM_EXAM_PENDING', 'AURUM_EXAM_PASSED', 'AURUM_EXAM_FAILED', 'DOCUMENT_VERIFICATION_PENDING', 'DOCUMENT_VERIFIED', 'DOCUMENT_VERIFICATION_FAILED', 'STUDENT_ADMISSION_UNDERTAKING_PENDING', 'STUDENT_ADMISSION_UNDERTAKING_SUBMITTED', 'ADMISSION_GRANTED', 'ADMISSION_REJECTED');
ALTER TABLE "public"."studentAdmissionApplications" ALTER COLUMN "applicationStatus" DROP DEFAULT;
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationStatus" TYPE "ApplicationStatus_new" USING ("applicationStatus"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "public"."ApplicationStatus_old";
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationStatus" SET DEFAULT 'SAVED_AS_DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "studentAdmissionApplications" ADD COLUMN     "intrestedInAurumExam" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "applicationStatus" SET DEFAULT 'SAVED_AS_DRAFT';

-- AlterTable
ALTER TABLE "studentEducationDetails" ADD COLUMN     "intermediateHallTicketNo" TEXT,
ADD COLUMN     "intermediateInstitutionName" TEXT,
ADD COLUMN     "sscHallTicketNo" TEXT,
ADD COLUMN     "sscInstitutionName" TEXT,
ADD COLUMN     "ugHallTicketNo" TEXT,
ADD COLUMN     "ugInstitutionName" TEXT,
ALTER COLUMN "sscBoard" DROP NOT NULL,
ALTER COLUMN "sscYearOfPassing" DROP NOT NULL,
ALTER COLUMN "sscPercentage" DROP NOT NULL,
ALTER COLUMN "intermediateBoard" DROP NOT NULL,
ALTER COLUMN "intermediateYearOfPassing" DROP NOT NULL,
ALTER COLUMN "intermediatePercentage" DROP NOT NULL;
