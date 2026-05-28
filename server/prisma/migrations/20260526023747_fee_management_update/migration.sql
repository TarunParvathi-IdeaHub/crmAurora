/*
  Warnings:

  - You are about to drop the `feeOverrideHistories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `programFeeStructures` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `registrationFees` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `feeCategoryId` to the `applicationFees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountDue` to the `paymentTransactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountPaid` to the `paymentTransactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "feeOverrideHistories" DROP CONSTRAINT "feeOverrideHistories_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "feeOverrideHistories" DROP CONSTRAINT "feeOverrideHistories_programId_fkey";

-- DropForeignKey
ALTER TABLE "feeOverrideHistories" DROP CONSTRAINT "feeOverrideHistories_studentAdmissionApplicationId_fkey";

-- DropForeignKey
ALTER TABLE "programFeeStructures" DROP CONSTRAINT "programFeeStructures_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "programFeeStructures" DROP CONSTRAINT "programFeeStructures_programId_fkey";

-- DropForeignKey
ALTER TABLE "registrationFees" DROP CONSTRAINT "registrationFees_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "registrationFees" DROP CONSTRAINT "registrationFees_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "registrationFees" DROP CONSTRAINT "registrationFees_studentAdmissionApplicationId_fkey";

-- AlterTable
ALTER TABLE "applicationFees" ADD COLUMN     "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 1000,
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "feeCategoryId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "paymentTransactions" ADD COLUMN     "amountDue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL;

-- DropTable
DROP TABLE "feeOverrideHistories";

-- DropTable
DROP TABLE "programFeeStructures";

-- DropTable
DROP TABLE "registrationFees";

-- AddForeignKey
ALTER TABLE "applicationFees" ADD CONSTRAINT "applicationFees_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "feeCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
