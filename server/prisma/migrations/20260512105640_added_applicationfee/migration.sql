-- CreateTable
CREATE TABLE "applicationFees" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicationFees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applicationFees_studentAdmissionApplicationId_key" ON "applicationFees"("studentAdmissionApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "applicationFees_invoiceId_key" ON "applicationFees"("invoiceId");

-- AddForeignKey
ALTER TABLE "applicationFees" ADD CONSTRAINT "applicationFees_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicationFees" ADD CONSTRAINT "applicationFees_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicationFees" ADD CONSTRAINT "applicationFees_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
