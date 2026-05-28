/*
  Warnings:

  - You are about to drop the `admissionApplicationPayments` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FeeCategoryType" AS ENUM ('APPLICATION_FEE', 'REGISTRATION_FEE', 'TUITION_FEE', 'HOSTEL_FEE', 'TRANSPORT_FEE', 'EXAM_FEE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ONLINE', 'CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI');

-- DropForeignKey
ALTER TABLE "admissionApplicationPayments" DROP CONSTRAINT "admissionApplicationPayments_studentAdmissionApplicationId_fkey";

-- DropTable
DROP TABLE "admissionApplicationPayments";

-- CreateTable
CREATE TABLE "institutionFinanceConfigs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "invoicePrefix" TEXT NOT NULL,
    "receiptPrefix" TEXT NOT NULL,
    "currentInvoiceNumber" INTEGER NOT NULL DEFAULT 0,
    "currentReceiptNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutionFinanceConfigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeCategories" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryType" "FeeCategoryType" NOT NULL,
    "feeName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "studentAdmissionApplicationId" TEXT,
    "feeCategoryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymentTransactions" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "transactionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "collectionDate" TIMESTAMP(3),
    "gatewayName" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "easebuzzPaymentId" TEXT,
    "orderId" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymentTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutionFinanceConfigs_institutionId_key" ON "institutionFinanceConfigs"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "feeCategories_institutionId_categoryType_key" ON "feeCategories"("institutionId", "categoryType");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "paymentTransactions_transactionId_key" ON "paymentTransactions"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_paymentTransactionId_key" ON "receipts"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receiptNumber_key" ON "receipts"("receiptNumber");

-- AddForeignKey
ALTER TABLE "institutionFinanceConfigs" ADD CONSTRAINT "institutionFinanceConfigs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeCategories" ADD CONSTRAINT "feeCategories_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "feeCategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paymentTransactions" ADD CONSTRAINT "paymentTransactions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paymentTransactions" ADD CONSTRAINT "paymentTransactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "paymentTransactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
