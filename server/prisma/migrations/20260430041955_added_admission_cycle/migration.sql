/*
  Warnings:

  - Added the required column `updatedAt` to the `degreeLevels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `degrees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `programs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "degreeLevels" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "degrees" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "admissionCycles" (
    "id" TEXT NOT NULL,
    "admissionCycleName" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "degreeId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissionCycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admissionCycles_admissionCycleName_programId_key" ON "admissionCycles"("admissionCycleName", "programId");

-- AddForeignKey
ALTER TABLE "admissionCycles" ADD CONSTRAINT "admissionCycles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionCycles" ADD CONSTRAINT "admissionCycles_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "degreeLevels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionCycles" ADD CONSTRAINT "admissionCycles_degreeId_fkey" FOREIGN KEY ("degreeId") REFERENCES "degrees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionCycles" ADD CONSTRAINT "admissionCycles_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
