-- AlterEnum
ALTER TYPE "LoanOfferStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "LoanOfferStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "LoanOfferStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- AlterTable
ALTER TABLE "LoanOffer"
ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '7 days');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING_DISBURSEMENT', 'ACTIVE', 'OVERDUE', 'CLOSED');

-- CreateEnum
CREATE TYPE "RepaymentScheduleItemStatus" AS ENUM ('PENDING', 'PAID', 'MISSED');

-- CreateTable
CREATE TABLE "Loan" (
  "id" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "loanOfferId" TEXT NOT NULL,
  "status" "LoanStatus" NOT NULL DEFAULT 'PENDING_DISBURSEMENT',
  "principalAmount" INTEGER NOT NULL,
  "interestAmount" INTEGER NOT NULL,
  "feeAmount" INTEGER NOT NULL,
  "totalRepayable" INTEGER NOT NULL,
  "contractSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentScheduleItem" (
  "id" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "RepaymentScheduleItemStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RepaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanOfferId_key" ON "Loan"("loanOfferId");
CREATE INDEX "Loan_borrowerId_status_idx" ON "Loan"("borrowerId", "status");
CREATE INDEX "RepaymentScheduleItem_loanId_dueDate_idx" ON "RepaymentScheduleItem"("loanId", "dueDate");

-- AddForeignKey
ALTER TABLE "Loan"
ADD CONSTRAINT "Loan_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Loan"
ADD CONSTRAINT "Loan_loanOfferId_fkey"
FOREIGN KEY ("loanOfferId") REFERENCES "LoanOffer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepaymentScheduleItem"
ADD CONSTRAINT "RepaymentScheduleItem_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
