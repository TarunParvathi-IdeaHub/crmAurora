/*
  Warnings:

  - You are about to drop the column `status` on the `enquiryForms` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "enquiryForms" DROP COLUMN "status";

-- DropEnum
DROP TYPE "EnquiryStatus";
