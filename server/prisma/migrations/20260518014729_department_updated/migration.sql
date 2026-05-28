/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `departments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "departments_phoneNumber_key" ON "departments"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "departments_email_key" ON "departments"("email");
