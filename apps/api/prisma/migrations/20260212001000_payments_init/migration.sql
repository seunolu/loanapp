-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('LOAN_REPAYMENT');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "purpose" "PaymentPurpose" NOT NULL DEFAULT 'LOAN_REPAYMENT',
  "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
  "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
  "providerRef" TEXT,
  "authorizationUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");
CREATE INDEX "Payment_borrowerId_createdAt_idx" ON "Payment"("borrowerId", "createdAt");
CREATE INDEX "Payment_loanId_status_idx" ON "Payment"("loanId", "status");

-- AddForeignKey
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
