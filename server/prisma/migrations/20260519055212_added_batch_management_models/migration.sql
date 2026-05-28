/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `enquiryForms` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "academicYears" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYearName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academicYears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batchPrograms" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "intakeCapacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batchPrograms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batchAcademicYears" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batchAcademicYears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batchAdmissionCycles" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "admissionCycleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batchAdmissionCycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicants" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "admissionCycleId" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,

    CONSTRAINT "applicants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academicYears_institutionId_academicYearName_key" ON "academicYears"("institutionId", "academicYearName");

-- CreateIndex
CREATE UNIQUE INDEX "batches_institutionId_batchName_key" ON "batches"("institutionId", "batchName");

-- CreateIndex
CREATE UNIQUE INDEX "batchPrograms_batchId_programId_key" ON "batchPrograms"("batchId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "batchAcademicYears_batchId_academicYearId_key" ON "batchAcademicYears"("batchId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "batchAdmissionCycles_batchId_admissionCycleId_key" ON "batchAdmissionCycles"("batchId", "admissionCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "applicants_email_key" ON "applicants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "enquiryForms_email_key" ON "enquiryForms"("email");

-- AddForeignKey
ALTER TABLE "academicYears" ADD CONSTRAINT "academicYears_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchPrograms" ADD CONSTRAINT "batchPrograms_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchPrograms" ADD CONSTRAINT "batchPrograms_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchPrograms" ADD CONSTRAINT "batchPrograms_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchAcademicYears" ADD CONSTRAINT "batchAcademicYears_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchAcademicYears" ADD CONSTRAINT "batchAcademicYears_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchAcademicYears" ADD CONSTRAINT "batchAcademicYears_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academicYears"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchAdmissionCycles" ADD CONSTRAINT "batchAdmissionCycles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchAdmissionCycles" ADD CONSTRAINT "batchAdmissionCycles_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batchAdmissionCycles" ADD CONSTRAINT "batchAdmissionCycles_admissionCycleId_fkey" FOREIGN KEY ("admissionCycleId") REFERENCES "admissionCycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "degreeLevels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_admissionCycleId_fkey" FOREIGN KEY ("admissionCycleId") REFERENCES "admissionCycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiryForms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
