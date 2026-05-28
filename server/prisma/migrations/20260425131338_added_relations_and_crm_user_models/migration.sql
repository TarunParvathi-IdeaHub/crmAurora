/*
  Warnings:

  - You are about to drop the column `userId` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `collegeAdmins` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "admins_userId_key";

-- DropIndex
DROP INDEX "collegeAdmins_userId_key";

-- AlterTable
ALTER TABLE "admins" DROP COLUMN "userId",
ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "collegeAdmins" DROP COLUMN "userId",
ADD COLUMN     "departmentId" TEXT;

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissionDirectors" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "empId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "alternateMobileNo" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "caste" TEXT NOT NULL,
    "sscMemo" TEXT,
    "intermediateMemo" TEXT,
    "ugMemo" TEXT,
    "pgMemo" TEXT,
    "phdMemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissionDirectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissionIncharges" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "empId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "alternateMobileNo" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "caste" TEXT NOT NULL,
    "sscMemo" TEXT,
    "intermediateMemo" TEXT,
    "ugMemo" TEXT,
    "pgMemo" TEXT,
    "phdMemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissionIncharges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissionConsultants" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "empId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "alternateMobileNo" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "caste" TEXT NOT NULL,
    "sscMemo" TEXT,
    "intermediateMemo" TEXT,
    "ugMemo" TEXT,
    "pgMemo" TEXT,
    "phdMemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissionConsultants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissionCounsellors" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "empId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "alternateMobileNo" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "caste" TEXT NOT NULL,
    "sscMemo" TEXT,
    "intermediateMemo" TEXT,
    "ugMemo" TEXT,
    "pgMemo" TEXT,
    "phdMemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissionCounsellors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_institutionId_schoolCode_key" ON "schools"("institutionId", "schoolCode");

-- CreateIndex
CREATE UNIQUE INDEX "departments_institutionId_departmentCode_key" ON "departments"("institutionId", "departmentCode");

-- CreateIndex
CREATE UNIQUE INDEX "admissionDirectors_empId_key" ON "admissionDirectors"("empId");

-- CreateIndex
CREATE UNIQUE INDEX "admissionDirectors_email_key" ON "admissionDirectors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admissionDirectors_mobileNo_key" ON "admissionDirectors"("mobileNo");

-- CreateIndex
CREATE UNIQUE INDEX "admissionIncharges_empId_key" ON "admissionIncharges"("empId");

-- CreateIndex
CREATE UNIQUE INDEX "admissionIncharges_email_key" ON "admissionIncharges"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admissionIncharges_mobileNo_key" ON "admissionIncharges"("mobileNo");

-- CreateIndex
CREATE UNIQUE INDEX "admissionConsultants_empId_key" ON "admissionConsultants"("empId");

-- CreateIndex
CREATE UNIQUE INDEX "admissionConsultants_email_key" ON "admissionConsultants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admissionConsultants_mobileNo_key" ON "admissionConsultants"("mobileNo");

-- CreateIndex
CREATE UNIQUE INDEX "admissionCounsellors_empId_key" ON "admissionCounsellors"("empId");

-- CreateIndex
CREATE UNIQUE INDEX "admissionCounsellors_email_key" ON "admissionCounsellors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admissionCounsellors_mobileNo_key" ON "admissionCounsellors"("mobileNo");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collegeAdmins" ADD CONSTRAINT "collegeAdmins_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionDirectors" ADD CONSTRAINT "admissionDirectors_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionDirectors" ADD CONSTRAINT "admissionDirectors_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionIncharges" ADD CONSTRAINT "admissionIncharges_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionIncharges" ADD CONSTRAINT "admissionIncharges_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionConsultants" ADD CONSTRAINT "admissionConsultants_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionConsultants" ADD CONSTRAINT "admissionConsultants_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionCounsellors" ADD CONSTRAINT "admissionCounsellors_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissionCounsellors" ADD CONSTRAINT "admissionCounsellors_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
