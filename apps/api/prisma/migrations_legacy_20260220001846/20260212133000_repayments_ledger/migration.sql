-- CreateEnum
CREATE TYPE "RepaymentAllocationType" AS ENUM ('FEES', 'PENALTIES', 'INTEREST', 'PRINCIPAL');

-- CreateTable
CREATE TABLE "LoanBalance" (
  "id" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "outstandingPrincipalKobo" INTEGER NOT NULL,
  "outstandingInterestKobo" INTEGER NOT NULL,
  "outstandingFeesKobo" INTEGER NOT NULL,
  "outstandingPenaltiesKobo" INTEGER NOT NULL DEFAULT 0,
  "totalOutstandingKobo" INTEGER NOT NULL,
  "paidPrincipalKobo" INTEGER NOT NULL DEFAULT 0,
  "paidInterestKobo" INTEGER NOT NULL DEFAULT 0,
  "paidFeesKobo" INTEGER NOT NULL DEFAULT 0,
  "paidPenaltiesKobo" INTEGER NOT NULL DEFAULT 0,
  "totalPaidKobo" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoanBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repayment" (
  "id" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "allocatedFeesKobo" INTEGER NOT NULL DEFAULT 0,
  "allocatedPenaltiesKobo" INTEGER NOT NULL DEFAULT 0,
  "allocatedInterestKobo" INTEGER NOT NULL DEFAULT 0,
  "allocatedPrincipalKobo" INTEGER NOT NULL DEFAULT 0,
  "unallocatedKobo" INTEGER NOT NULL DEFAULT 0,
  "journalEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Repayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepaymentAllocation" (
  "id" TEXT NOT NULL,
  "repaymentId" TEXT NOT NULL,
  "bucket" "RepaymentAllocationType" NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RepaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanBalance_loanId_key" ON "LoanBalance"("loanId");
CREATE UNIQUE INDEX "Repayment_paymentId_key" ON "Repayment"("paymentId");
CREATE UNIQUE INDEX "Repayment_journalEntryId_key" ON "Repayment"("journalEntryId");
CREATE INDEX "Repayment_loanId_createdAt_idx" ON "Repayment"("loanId", "createdAt");
CREATE INDEX "RepaymentAllocation_repaymentId_idx" ON "RepaymentAllocation"("repaymentId");
CREATE INDEX "RepaymentAllocation_bucket_idx" ON "RepaymentAllocation"("bucket");

-- Backfill LoanBalance for existing loans
INSERT INTO "LoanBalance" (
  "id",
  "loanId",
  "outstandingPrincipalKobo",
  "outstandingInterestKobo",
  "outstandingFeesKobo",
  "outstandingPenaltiesKobo",
  "totalOutstandingKobo",
  "paidPrincipalKobo",
  "paidInterestKobo",
  "paidFeesKobo",
  "paidPenaltiesKobo",
  "totalPaidKobo",
  "createdAt",
  "updatedAt"
)
SELECT
  'lb_' || "id",
  "id",
  "principalAmount",
  "interestAmount",
  "feeAmount",
  0,
  "totalRepayable",
  0,
  0,
  0,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Loan"
ON CONFLICT ("loanId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "LoanBalance"
ADD CONSTRAINT "LoanBalance_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Repayment"
ADD CONSTRAINT "Repayment_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Repayment"
ADD CONSTRAINT "Repayment_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Repayment"
ADD CONSTRAINT "Repayment_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RepaymentAllocation"
ADD CONSTRAINT "RepaymentAllocation_repaymentId_fkey"
FOREIGN KEY ("repaymentId") REFERENCES "Repayment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
