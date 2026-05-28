/*
  Warnings:

  - Added the required column `callResponse` to the `consultantCallLogs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `callResponse` to the `counsellorCallLogs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "consultantCallLogs" DROP COLUMN "callResponse",
ADD COLUMN     "callResponse" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "counsellorCallLogs" DROP COLUMN "callResponse",
ADD COLUMN     "callResponse" TEXT NOT NULL;

-- DropEnum
DROP TYPE "CallResponse";
