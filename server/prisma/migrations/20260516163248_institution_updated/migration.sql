/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `institutions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `institutions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `institutions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `institutions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "institutions_phoneNumber_key" ON "institutions"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_email_key" ON "institutions"("email");
