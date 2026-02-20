ALTER TABLE "TenantLoanApplication"
ADD COLUMN IF NOT EXISTS "requestedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "approvedAmount" DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS "disbursedAmount" DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS "outstandingPrincipal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "outstandingInterest" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "outstandingFees" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "TenantLoanApplication"
SET "requestedAmount" = COALESCE("requestedAmount", "amount"::DECIMAL(18,2), 0);

UPDATE "TenantLoanApplication"
SET "outstandingPrincipal" = COALESCE("approvedAmount", "requestedAmount", "amount"::DECIMAL(18,2), 0),
    "outstandingInterest" = 0,
    "outstandingFees" = 0
WHERE "status" = 'APPROVED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantDisbursementMethod') THEN
    CREATE TYPE "TenantDisbursementMethod" AS ENUM ('BANK_TRANSFER', 'WALLET', 'CASH');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerAccountType') THEN
    CREATE TYPE "TenantLedgerAccountType" AS ENUM ('LOAN_PRINCIPAL', 'LOAN_INTEREST', 'LOAN_FEES', 'CASH', 'SUSPENSE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerReferenceType') THEN
    CREATE TYPE "TenantLedgerReferenceType" AS ENUM ('DISBURSEMENT', 'REPAYMENT', 'ADJUSTMENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerDirection') THEN
    CREATE TYPE "TenantLedgerDirection" AS ENUM ('DEBIT', 'CREDIT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantRepaymentScheduleStatus') THEN
    CREATE TYPE "TenantRepaymentScheduleStatus" AS ENUM ('DUE', 'PAID', 'OVERDUE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantRepaymentMethod') THEN
    CREATE TYPE "TenantRepaymentMethod" AS ENUM ('BANK_TRANSFER', 'CARD', 'WALLET', 'CASH');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TenantDisbursement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "method" "TenantDisbursementMethod" NOT NULL,
  "reference" TEXT,
  "disbursedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantDisbursement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantDisbursement_loanApplicationId_key" UNIQUE ("loanApplicationId")
);

CREATE TABLE IF NOT EXISTS "TenantLedgerAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "TenantLedgerAccountType" NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantLedgerAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantLedgerAccount_tenantId_type_key" UNIQUE ("tenantId", "type")
);

CREATE TABLE IF NOT EXISTS "TenantLedgerEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "referenceType" "TenantLedgerReferenceType" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenantLedgerLine" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "direction" "TenantLedgerDirection" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantLedgerLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenantRepaymentSchedule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "installmentNo" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "principalDue" DECIMAL(18,2) NOT NULL,
  "interestDue" DECIMAL(18,2) NOT NULL,
  "feesDue" DECIMAL(18,2) NOT NULL,
  "totalDue" DECIMAL(18,2) NOT NULL,
  "status" "TenantRepaymentScheduleStatus" NOT NULL DEFAULT 'DUE',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantRepaymentSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantRepaymentSchedule_loanApplicationId_installmentNo_key" UNIQUE ("loanApplicationId", "installmentNo")
);

CREATE TABLE IF NOT EXISTS "TenantRepayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "method" "TenantRepaymentMethod" NOT NULL,
  "reference" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantRepayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_disbursedAt_idx" ON "TenantDisbursement"("tenantId", "disbursedAt");
CREATE INDEX IF NOT EXISTS "TenantLedgerAccount_tenantId_createdAt_idx" ON "TenantLedgerAccount"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "TenantLedgerEntry_tenantId_occurredAt_idx" ON "TenantLedgerEntry"("tenantId", "occurredAt");
CREATE INDEX IF NOT EXISTS "TenantLedgerEntry_referenceType_referenceId_idx" ON "TenantLedgerEntry"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS "TenantLedgerLine_tenantId_createdAt_idx" ON "TenantLedgerLine"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "TenantLedgerLine_entryId_idx" ON "TenantLedgerLine"("entryId");
CREATE INDEX IF NOT EXISTS "TenantLedgerLine_accountId_idx" ON "TenantLedgerLine"("accountId");
CREATE INDEX IF NOT EXISTS "TenantRepaymentSchedule_tenantId_dueDate_idx" ON "TenantRepaymentSchedule"("tenantId", "dueDate");
CREATE INDEX IF NOT EXISTS "TenantRepayment_tenantId_paidAt_idx" ON "TenantRepayment"("tenantId", "paidAt");
CREATE INDEX IF NOT EXISTS "TenantRepayment_loanApplicationId_paidAt_idx" ON "TenantRepayment"("loanApplicationId", "paidAt");

ALTER TABLE "TenantDisbursement"
ADD CONSTRAINT "TenantDisbursement_loanApplicationId_fkey"
FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantLedgerLine"
ADD CONSTRAINT "TenantLedgerLine_entryId_fkey"
FOREIGN KEY ("entryId") REFERENCES "TenantLedgerEntry"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantLedgerLine"
ADD CONSTRAINT "TenantLedgerLine_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "TenantLedgerAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TenantRepaymentSchedule"
ADD CONSTRAINT "TenantRepaymentSchedule_loanApplicationId_fkey"
FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantRepayment"
ADD CONSTRAINT "TenantRepayment_loanApplicationId_fkey"
FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
