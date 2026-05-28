/*
  Warnings:

  - You are about to drop the column `degreeId` on the `admissionCycles` table. All the data in the column will be lost.
  - You are about to drop the column `degreeId` on the `enquiryForms` table. All the data in the column will be lost.
  - You are about to drop the column `degreeId` on the `programs` table. All the data in the column will be lost.
  - You are about to drop the `degrees` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'SUBMITTED');

-- DropForeignKey
ALTER TABLE "admissionCycles" DROP CONSTRAINT "admissionCycles_degreeId_fkey";

-- DropForeignKey
ALTER TABLE "degrees" DROP CONSTRAINT "degrees_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "degrees" DROP CONSTRAINT "degrees_levelId_fkey";

-- DropForeignKey
ALTER TABLE "enquiryForms" DROP CONSTRAINT "enquiryForms_degreeId_fkey";

-- DropForeignKey
ALTER TABLE "programs" DROP CONSTRAINT "programs_degreeId_fkey";

-- AlterTable
ALTER TABLE "admissionCycles" DROP COLUMN "degreeId";

-- AlterTable
ALTER TABLE "enquiryForms" DROP COLUMN "degreeId";

-- AlterTable
ALTER TABLE "programs" DROP COLUMN "degreeId";

-- DropTable
DROP TABLE "degrees";

-- CreateTable
CREATE TABLE "studentAdmissionApplications" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "degreeLevelId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "admissionCycleId" TEXT NOT NULL,
    "admissionCounsellorId" TEXT,
    "admissionConsultantId" TEXT,
    "enquiryId" TEXT,
    "applicationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "fatherMobileNo" TEXT NOT NULL,
    "fatherEmail" TEXT,
    "motherName" TEXT NOT NULL,
    "motherMobileNo" TEXT NOT NULL,
    "motherEmail" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "aadharNo" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "caste" TEXT NOT NULL,
    "subCaste" TEXT NOT NULL,
    "presentAddress" TEXT NOT NULL,
    "permanentAddress" TEXT NOT NULL,
    "quallingEntranceExam" TEXT,
    "entranceExamHallTicketNo" TEXT,
    "entranceExamRank" TEXT,
    "sscMemo" TEXT,
    "intermediateMemo" TEXT,
    "ugMemo" TEXT,
    "pgMemo" TEXT,
    "bonafideCertificate" TEXT,
    "transferCertificate" TEXT,
    "applicationStatus" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "consentDeclaration" TEXT,

    CONSTRAINT "studentAdmissionApplications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studentEducationDetails" (
    "id" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "uid" TEXT,
    "applicationId" TEXT,
    "sscBoard" TEXT NOT NULL,
    "sscYearOfPassing" INTEGER NOT NULL,
    "sscPercentage" DOUBLE PRECISION NOT NULL,
    "intermediateBoard" TEXT NOT NULL,
    "intermediateYearOfPassing" INTEGER NOT NULL,
    "intermediatePercentage" DOUBLE PRECISION NOT NULL,
    "ugBoard" TEXT,
    "ugYearOfPassing" INTEGER,
    "ugPercentage" DOUBLE PRECISION,
    "pgBoard" TEXT,
    "pgYearOfPassing" INTEGER,
    "pgPercentage" DOUBLE PRECISION,

    CONSTRAINT "studentEducationDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissionApplicationPayments" (
    "id" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "tranxId" TEXT NOT NULL,
    "ampount" INTEGER NOT NULL DEFAULT 1000,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "easebuzzPaymentId" TEXT,
    "easebuzzStatus" TEXT,
    "paymentMethod" TEXT,
    "hash" TEXT,
    "paymentTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissionApplicationPayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admissionApplicationPayments_tranxId_key" ON "admissionApplicationPayments"("tranxId");

-- CreateIndex
CREATE UNIQUE INDEX "admissionApplicationPayments_easebuzzPaymentId_key" ON "admissionApplicationPayments"("easebuzzPaymentId");

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_degreeLevelId_fkey" FOREIGN KEY ("degreeLevelId") REFERENCES "degreeLevels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_admissionCycleId_fkey" FOREIGN KEY ("admissionCycleId") REFERENCES "admissionCycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_admissionCounsellorId_fkey" FOREIGN KEY ("admissionCounsellorId") REFERENCES "admissionCounsellors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_admissionConsultantId_fkey" FOREIGN KEY ("admissionConsultantId") REFERENCES "admissionConsultants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiryForms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentEducationDetails" ADD CONSTRAINT "studentEducationDetails_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionApplicationPayments" ADD CONSTRAINT "admissionApplicationPayments_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
