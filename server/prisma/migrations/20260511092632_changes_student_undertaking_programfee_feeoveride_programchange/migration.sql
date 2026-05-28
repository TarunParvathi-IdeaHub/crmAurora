/*
  Warnings:

  - You are about to drop the column `oldAdmissionFee` on the `feeOverrideHistories` table. All the data in the column will be lost.
  - You are about to drop the column `oldPlacementTrainingFee` on the `feeOverrideHistories` table. All the data in the column will be lost.
  - You are about to drop the column `oldSpecialFee` on the `feeOverrideHistories` table. All the data in the column will be lost.
  - You are about to drop the column `oldStudentExpanses` on the `feeOverrideHistories` table. All the data in the column will be lost.
  - You are about to drop the column `oldTuitionFee` on the `feeOverrideHistories` table. All the data in the column will be lost.
  - You are about to drop the column `oldProgramId` on the `programChangeHistories` table. All the data in the column will be lost.
  - You are about to drop the `studentUndertakings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `undertakingTemplates` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `actualAdmissionFee` to the `feeOverrideHistories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualTuitionFee` to the `feeOverrideHistories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualProgramId` to the `programChangeHistories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStatus" ADD VALUE 'STUDENT_ADMISSION_UNDERTAKING_PENDING';
ALTER TYPE "ApplicationStatus" ADD VALUE 'PARENT_ADMISSION_UNDERTAKING_PENDING';

-- DropForeignKey
ALTER TABLE "programChangeHistories" DROP CONSTRAINT "programChangeHistories_oldProgramId_fkey";

-- DropForeignKey
ALTER TABLE "studentUndertakings" DROP CONSTRAINT "studentUndertakings_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "studentUndertakings" DROP CONSTRAINT "studentUndertakings_programId_fkey";

-- DropForeignKey
ALTER TABLE "studentUndertakings" DROP CONSTRAINT "studentUndertakings_studentAdmissionApplicationId_fkey";

-- DropForeignKey
ALTER TABLE "studentUndertakings" DROP CONSTRAINT "studentUndertakings_templateId_fkey";

-- DropForeignKey
ALTER TABLE "undertakingTemplates" DROP CONSTRAINT "undertakingTemplates_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "undertakingTemplates" DROP CONSTRAINT "undertakingTemplates_programId_fkey";

-- AlterTable
ALTER TABLE "feeOverrideHistories" DROP COLUMN "oldAdmissionFee",
DROP COLUMN "oldPlacementTrainingFee",
DROP COLUMN "oldSpecialFee",
DROP COLUMN "oldStudentExpanses",
DROP COLUMN "oldTuitionFee",
ADD COLUMN     "actualAdmissionFee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "actualPlacementTrainingFee" DOUBLE PRECISION,
ADD COLUMN     "actualSpecialFee" DOUBLE PRECISION,
ADD COLUMN     "actualStudentExpanses" DOUBLE PRECISION,
ADD COLUMN     "actualTuitionFee" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "programChangeHistories" DROP COLUMN "oldProgramId",
ADD COLUMN     "actualProgramId" TEXT NOT NULL;

-- DropTable
DROP TABLE "studentUndertakings";

-- DropTable
DROP TABLE "undertakingTemplates";

-- CreateTable
CREATE TABLE "studentAdmissionUndertakingTemplates" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studentAdmissionUndertakingTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studentAdmissionUndertakings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "nameOfTheStudent" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "programEnrolling" TEXT NOT NULL,
    "studentDelaration" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "UndertakingStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedContent" JSONB NOT NULL,
    "tuitionFee" DOUBLE PRECISION,
    "admissionFee" DOUBLE PRECISION,
    "specialFee" DOUBLE PRECISION,
    "placementTrainingFee" DOUBLE PRECISION,
    "studentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "parentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "studentAcceptedAt" TIMESTAMP(3),
    "parentAcceptedAt" TIMESTAMP(3),
    "studentSignature" TEXT,
    "parentSignature" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studentAdmissionUndertakings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studentAdmissionUndertakings_studentAdmissionApplicationId_key" ON "studentAdmissionUndertakings"("studentAdmissionApplicationId");

-- AddForeignKey
ALTER TABLE "studentAdmissionUndertakingTemplates" ADD CONSTRAINT "studentAdmissionUndertakingTemplates_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionUndertakingTemplates" ADD CONSTRAINT "studentAdmissionUndertakingTemplates_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionUndertakings" ADD CONSTRAINT "studentAdmissionUndertakings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionUndertakings" ADD CONSTRAINT "studentAdmissionUndertakings_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionUndertakings" ADD CONSTRAINT "studentAdmissionUndertakings_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentAdmissionUndertakings" ADD CONSTRAINT "studentAdmissionUndertakings_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "studentAdmissionUndertakingTemplates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programChangeHistories" ADD CONSTRAINT "programChangeHistories_actualProgramId_fkey" FOREIGN KEY ("actualProgramId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
