-- AlterTable
ALTER TABLE "paymentTransactions" ADD COLUMN     "studentAdmissionApplicationId" TEXT;

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "studentAdmissionApplicationId" TEXT;

-- AddForeignKey
ALTER TABLE "paymentTransactions" ADD CONSTRAINT "paymentTransactions_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
