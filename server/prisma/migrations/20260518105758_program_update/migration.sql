-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "schoolId" TEXT;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
