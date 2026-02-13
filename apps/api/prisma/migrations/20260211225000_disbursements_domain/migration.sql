-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('INITIATED');

-- CreateTable
CREATE TABLE "BankAccount" (
  "id" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "bankCode" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
  "id" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "status" "DisbursementStatus" NOT NULL DEFAULT 'INITIATED',
  "initiatedBy" TEXT NOT NULL,
  "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_borrowerId_bankCode_accountNumber_key" ON "BankAccount"("borrowerId", "bankCode", "accountNumber");
CREATE INDEX "BankAccount_borrowerId_isDefault_idx" ON "BankAccount"("borrowerId", "isDefault");
CREATE UNIQUE INDEX "Disbursement_loanId_key" ON "Disbursement"("loanId");
CREATE INDEX "Disbursement_bankAccountId_idx" ON "Disbursement"("bankAccountId");
CREATE INDEX "Disbursement_status_initiatedAt_idx" ON "Disbursement"("status", "initiatedAt");

-- AddForeignKey
ALTER TABLE "BankAccount"
ADD CONSTRAINT "BankAccount_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Disbursement"
ADD CONSTRAINT "Disbursement_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Disbursement"
ADD CONSTRAINT "Disbursement_bankAccountId_fkey"
FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Disbursement"
ADD CONSTRAINT "Disbursement_initiatedBy_fkey"
FOREIGN KEY ("initiatedBy") REFERENCES "AdminUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
