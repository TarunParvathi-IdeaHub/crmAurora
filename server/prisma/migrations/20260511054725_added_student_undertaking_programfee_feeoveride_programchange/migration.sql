-- CreateEnum
CREATE TYPE "UndertakingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "undertakingTemplates" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "undertakingTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studentUndertakings" (
    "id" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
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

    CONSTRAINT "studentUndertakings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programFeeStructures" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "tuitionFee" DOUBLE PRECISION NOT NULL,
    "admissionFee" DOUBLE PRECISION NOT NULL,
    "specialFee" DOUBLE PRECISION,
    "placementTrainingFee" DOUBLE PRECISION,
    "studentExpanses" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programFeeStructures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeOverrideHistories" (
    "id" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "oldTuitionFee" DOUBLE PRECISION NOT NULL,
    "newTuitionFee" DOUBLE PRECISION NOT NULL,
    "oldAdmissionFee" DOUBLE PRECISION NOT NULL,
    "newAdmissionFee" DOUBLE PRECISION NOT NULL,
    "oldSpecialFee" DOUBLE PRECISION,
    "newSpecialFee" DOUBLE PRECISION,
    "oldPlacementTrainingFee" DOUBLE PRECISION,
    "newPlacementTrainingFee" DOUBLE PRECISION,
    "oldStudentExpanses" DOUBLE PRECISION,
    "newStudentExpanses" DOUBLE PRECISION,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "changedByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feeOverrideHistories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programChangeHistories" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "oldProgramId" TEXT NOT NULL,
    "newProgramId" TEXT NOT NULL,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "changedByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programChangeHistories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studentUndertakings_studentAdmissionApplicationId_key" ON "studentUndertakings"("studentAdmissionApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "programFeeStructures_institutionId_programId_academicYear_key" ON "programFeeStructures"("institutionId", "programId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "feeOverrideHistories_studentAdmissionApplicationId_key" ON "feeOverrideHistories"("studentAdmissionApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "programChangeHistories_studentAdmissionApplicationId_key" ON "programChangeHistories"("studentAdmissionApplicationId");

-- AddForeignKey
ALTER TABLE "undertakingTemplates" ADD CONSTRAINT "undertakingTemplates_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "undertakingTemplates" ADD CONSTRAINT "undertakingTemplates_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentUndertakings" ADD CONSTRAINT "studentUndertakings_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentUndertakings" ADD CONSTRAINT "studentUndertakings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentUndertakings" ADD CONSTRAINT "studentUndertakings_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studentUndertakings" ADD CONSTRAINT "studentUndertakings_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "undertakingTemplates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programFeeStructures" ADD CONSTRAINT "programFeeStructures_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programFeeStructures" ADD CONSTRAINT "programFeeStructures_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeOverrideHistories" ADD CONSTRAINT "feeOverrideHistories_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeOverrideHistories" ADD CONSTRAINT "feeOverrideHistories_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeOverrideHistories" ADD CONSTRAINT "feeOverrideHistories_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programChangeHistories" ADD CONSTRAINT "programChangeHistories_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programChangeHistories" ADD CONSTRAINT "programChangeHistories_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programChangeHistories" ADD CONSTRAINT "programChangeHistories_oldProgramId_fkey" FOREIGN KEY ("oldProgramId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programChangeHistories" ADD CONSTRAINT "programChangeHistories_newProgramId_fkey" FOREIGN KEY ("newProgramId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
