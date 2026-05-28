/*
  Warnings:

  - Added the required column `staffType` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `staffType` to the `admissionConsultants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `staffType` to the `admissionCounsellors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `staffType` to the `admissionDirectors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `staffType` to the `admissionIncharges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `staffType` to the `collegeAdmins` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "staffType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "admissionConsultants" ADD COLUMN     "staffType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "admissionCounsellors" ADD COLUMN     "staffType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "admissionDirectors" ADD COLUMN     "staffType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "admissionIncharges" ADD COLUMN     "staffType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "collegeAdmins" ADD COLUMN     "staffType" TEXT NOT NULL;
