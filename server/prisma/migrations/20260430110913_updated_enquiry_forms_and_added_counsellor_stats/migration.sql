/*
  Warnings:

  - Added the required column `admissionCounsellorId` to the `enquiryForms` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'ASSIGNED', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdmissionResult" AS ENUM ('ADMITTED', 'NOT_ADMITTED');

-- AlterTable
ALTER TABLE "enquiryForms" ADD COLUMN     "admissionCounsellorId" TEXT NOT NULL,
ADD COLUMN     "result" "AdmissionResult",
ADD COLUMN     "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "counsellorStats" (
    "id" TEXT NOT NULL,
    "counsellorId" TEXT NOT NULL,
    "totalAssigned" INTEGER NOT NULL DEFAULT 0,
    "totalClosed" INTEGER NOT NULL DEFAULT 0,
    "totalAdmitted" INTEGER NOT NULL DEFAULT 0,
    "totalNorAdmitted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counsellorStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "counsellorStats_counsellorId_key" ON "counsellorStats"("counsellorId");

-- AddForeignKey
ALTER TABLE "enquiryForms" ADD CONSTRAINT "enquiryForms_admissionCounsellorId_fkey" FOREIGN KEY ("admissionCounsellorId") REFERENCES "admissionCounsellors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counsellorStats" ADD CONSTRAINT "counsellorStats_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "admissionCounsellors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
