/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `schools` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `schools` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `schools` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `schools` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "schools_phoneNumber_key" ON "schools"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "schools_email_key" ON "schools"("email");
