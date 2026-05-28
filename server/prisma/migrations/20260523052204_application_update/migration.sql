/*
  Warnings:

  - You are about to drop the column `counsellorId` on the `studentAdmissionApplications` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "studentAdmissionApplications" DROP CONSTRAINT "studentAdmissionApplications_counsellorId_fkey";

-- AlterTable
ALTER TABLE "studentAdmissionApplications" DROP COLUMN "counsellorId",
ADD COLUMN     "admissionCounsellorId" TEXT;

-- AddForeignKey
ALTER TABLE "studentAdmissionApplications" ADD CONSTRAINT "studentAdmissionApplications_admissionCounsellorId_fkey" FOREIGN KEY ("admissionCounsellorId") REFERENCES "admissionCounsellors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
