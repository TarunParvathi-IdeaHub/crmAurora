/*
  Warnings:

  - You are about to drop the column `admissionCounsellorId` on the `studentAdmissionApplications` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "studentAdmissionApplications" DROP CONSTRAINT "studentAdmissionApplications_admissionCounsellorId_fkey";

-- AlterTable
ALTER TABLE "studentAdmissionApplications" DROP COLUMN "admissionCounsellorId",
ADD COLUMN     "counsellorId" TEXT;

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "admissionCounsellors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
