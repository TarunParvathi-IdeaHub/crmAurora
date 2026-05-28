/*
  Warnings:

  - You are about to drop the column `totalNorAdmitted` on the `counsellorStats` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "enquiryForms" DROP CONSTRAINT "enquiryForms_admissionCounsellorId_fkey";

-- AlterTable
ALTER TABLE "counsellorStats" DROP COLUMN "totalNorAdmitted",
ADD COLUMN     "totalNotAdmitted" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "enquiryForms" ADD COLUMN     "admissionConsultantId" TEXT,
ALTER COLUMN "admissionCounsellorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "consultantStats" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "totalAssigned" INTEGER NOT NULL DEFAULT 0,
    "totalClosed" INTEGER NOT NULL DEFAULT 0,
    "totalAdmitted" INTEGER NOT NULL DEFAULT 0,
    "totalNotAdmitted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultantStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultantCallLogs" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "callType" "CallType" NOT NULL,
    "callStatus" "CallStatus" NOT NULL,
    "callResponse" "CallResponse",
    "notes" TEXT,
    "callTime" TIMESTAMP(3) NOT NULL,
    "nextFollowUp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultantCallLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultantStats_consultantId_key" ON "consultantStats"("consultantId");

-- AddForeignKey
ALTER TABLE "enquiryForms" ADD CONSTRAINT "enquiryForms_admissionCounsellorId_fkey" FOREIGN KEY ("admissionCounsellorId") REFERENCES "admissionCounsellors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiryForms" ADD CONSTRAINT "enquiryForms_admissionConsultantId_fkey" FOREIGN KEY ("admissionConsultantId") REFERENCES "admissionConsultants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultantStats" ADD CONSTRAINT "consultantStats_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "admissionConsultants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultantCallLogs" ADD CONSTRAINT "consultantCallLogs_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiryForms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultantCallLogs" ADD CONSTRAINT "consultantCallLogs_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "admissionConsultants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
