/*
  Warnings:

  - You are about to drop the column `applicationId` on the `applicants` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[applicationNumber]` on the table `studentAdmissionApplications` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "applicants_applicationId_key";

-- AlterTable
ALTER TABLE "applicants" DROP COLUMN "applicationId";

-- AlterTable
ALTER TABLE "studentAdmissionApplications" ALTER COLUMN "applicationNumber" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "studentAdmissionApplications_applicationNumber_key" ON "studentAdmissionApplications"("applicationNumber");
