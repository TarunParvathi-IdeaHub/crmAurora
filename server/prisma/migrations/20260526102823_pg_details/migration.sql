-- AlterEnum
ALTER TYPE "VerificationDocumentType" ADD VALUE 'GAP_CERTIFICATE';

-- AlterTable
ALTER TABLE "studentAdmissionApplications" ADD COLUMN     "gapCertificate" TEXT;

-- AlterTable
ALTER TABLE "studentEducationDetails" ADD COLUMN     "pgHallTicketNo" TEXT,
ADD COLUMN     "pgInstitutionName" TEXT;
