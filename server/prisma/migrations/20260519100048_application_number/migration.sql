/*
  Warnings:

  - You are about to drop the column `applicationId` on the `studentAdmissionApplications` table. All the data in the column will be lost.
  - You are about to drop the column `applicationId` on the `studentAdmissionUndertakings` table. All the data in the column will be lost.
  - You are about to drop the column `applicationId` on the `studentEducationDetails` table. All the data in the column will be lost.
  - Added the required column `applicationNumber` to the `studentAdmissionApplications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applicationNumber` to the `studentAdmissionUndertakings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "studentAdmissionApplications" DROP COLUMN "applicationId",
ADD COLUMN     "applicationNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "studentAdmissionUndertakings" DROP COLUMN "applicationId",
ADD COLUMN     "applicationNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "studentEducationDetails" DROP COLUMN "applicationId",
ADD COLUMN     "applicationNumber" TEXT;
