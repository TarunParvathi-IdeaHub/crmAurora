/*
  Warnings:

  - You are about to drop the column `ampount` on the `admissionApplicationPayments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTime` on the `admissionApplicationPayments` table. All the data in the column will be lost.
  - You are about to drop the column `tranxId` on the `admissionApplicationPayments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `studentAdmissionApplications` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[txnId]` on the table `admissionApplicationPayments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderId]` on the table `admissionApplicationPayments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `txnId` to the `admissionApplicationPayments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('EXTERNAL', 'AURUM');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- DropIndex
DROP INDEX "admissionApplicationPayments_tranxId_key";

-- AlterTable
ALTER TABLE "admissionApplicationPayments" DROP COLUMN "ampount",
DROP COLUMN "paymentTime",
DROP COLUMN "tranxId",
ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "txnId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "studentAdmissionApplications" DROP COLUMN "paymentStatus";

-- CreateTable
CREATE TABLE "entranceExams" (
    "id" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "examType" "ExamType" NOT NULL,
    "examName" TEXT,
    "hallTicketNo" TEXT,
    "rank" TEXT NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entranceExams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admissionApplicationPayments_txnId_key" ON "admissionApplicationPayments"("txnId");

-- CreateIndex
CREATE UNIQUE INDEX "admissionApplicationPayments_orderId_key" ON "admissionApplicationPayments"("orderId");

-- CreateIndex
CREATE INDEX "admissionApplicationPayments_studentAdmissionApplicationId_idx" ON "admissionApplicationPayments"("studentAdmissionApplicationId");

-- AddForeignKey
ALTER TABLE "entranceExams" ADD CONSTRAINT "entranceExams_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
