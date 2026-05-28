-- AlterTable
ALTER TABLE "admissionCycles" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "enquiryForms" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "degreeId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "admissionCycleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiryForms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "enquiryForms" ADD CONSTRAINT "enquiryForms_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiryForms" ADD CONSTRAINT "enquiryForms_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "degreeLevels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiryForms" ADD CONSTRAINT "enquiryForms_degreeId_fkey" FOREIGN KEY ("degreeId") REFERENCES "degrees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiryForms" ADD CONSTRAINT "enquiryForms_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiryForms" ADD CONSTRAINT "enquiryForms_admissionCycleId_fkey" FOREIGN KEY ("admissionCycleId") REFERENCES "admissionCycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
