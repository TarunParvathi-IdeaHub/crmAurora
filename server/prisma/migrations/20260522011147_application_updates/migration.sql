/*
  Warnings:

  - Added the required column `state` to the `studentAdmissionApplications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "studentAdmissionApplications" ADD COLUMN     "state" TEXT NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "fatherName" DROP NOT NULL,
ALTER COLUMN "fatherMobileNo" DROP NOT NULL,
ALTER COLUMN "motherName" DROP NOT NULL,
ALTER COLUMN "motherMobileNo" DROP NOT NULL,
ALTER COLUMN "dateOfBirth" DROP NOT NULL,
ALTER COLUMN "aadharNo" DROP NOT NULL,
ALTER COLUMN "bloodGroup" DROP NOT NULL,
ALTER COLUMN "caste" DROP NOT NULL,
ALTER COLUMN "subCaste" DROP NOT NULL,
ALTER COLUMN "presentAddress" DROP NOT NULL,
ALTER COLUMN "permanentAddress" DROP NOT NULL;
