-- CreateTable
CREATE TABLE "registrationFees" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentAdmissionApplicationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrationFees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registrationFees_studentAdmissionApplicationId_key" ON "registrationFees"("studentAdmissionApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "registrationFees_invoiceId_key" ON "registrationFees"("invoiceId");

-- AddForeignKey
ALTER TABLE "registrationFees" ADD CONSTRAINT "registrationFees_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrationFees" ADD CONSTRAINT "registrationFees_studentAdmissionApplicationId_fkey" FOREIGN KEY ("studentAdmissionApplicationId") REFERENCES "studentAdmissionApplications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrationFees" ADD CONSTRAINT "registrationFees_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
