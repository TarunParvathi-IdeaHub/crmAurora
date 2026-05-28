/*
  Warnings:

  - A unique constraint covering the columns `[applicationId]` on the table `applicants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `applicants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "applicants" ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "studentAdmissionApplicationId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "applicants_applicationId_key" ON "applicants"("applicationId");

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
