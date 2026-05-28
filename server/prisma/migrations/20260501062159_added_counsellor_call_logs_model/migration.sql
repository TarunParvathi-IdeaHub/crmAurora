-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('ANSWERED', 'NO_RESPONSE', 'BUSY', 'REJECTED');

-- CreateEnum
CREATE TYPE "CallResponse" AS ENUM ('CALL_BACK_LATER', 'WILL_JOIN', 'NEEDS_INFORMATION', 'THINKING', 'NOT_INTRESTED', 'WRONG_NUMBER');

-- CreateTable
CREATE TABLE "counsellorCallLogs" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "counsellorId" TEXT NOT NULL,
    "callType" "CallType" NOT NULL,
    "callStatus" "CallStatus" NOT NULL,
    "callResponse" "CallResponse",
    "notes" TEXT,
    "callTime" TIMESTAMP(3) NOT NULL,
    "nextFollowUp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counsellorCallLogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "counsellorCallLogs" ADD CONSTRAINT "counsellorCallLogs_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiryForms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counsellorCallLogs" ADD CONSTRAINT "counsellorCallLogs_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "admissionCounsellors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
