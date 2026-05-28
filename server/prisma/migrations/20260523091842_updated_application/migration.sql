-- AlterTable
ALTER TABLE "studentAdmissionApplications" ADD COLUMN     "city" TEXT,
ADD COLUMN     "pincode" TEXT,
ALTER COLUMN "state" DROP NOT NULL;
