DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LoanRepaymentScheduleItemStatus') THEN
    CREATE TYPE "LoanRepaymentScheduleItemStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LoanRepaymentChannel') THEN
    CREATE TYPE "LoanRepaymentChannel" AS ENUM ('MANUAL', 'BANK_TRANSFER', 'CARD', 'USSD', 'CASH');
  END IF;
END $$;

ALTER TABLE "TenantLoanApplication"
  ADD COLUMN IF NOT EXISTS "principal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS "annualInterestRateBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "termInDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "repaymentFrequency" "RepaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "disbursedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "outstandingTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextDueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fullyRepaidAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "LoanRepaymentScheduleItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "installmentNumber" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "principalDue" DECIMAL(18,2) NOT NULL,
  "interestDue" DECIMAL(18,2) NOT NULL,
  "feesDue" DECIMAL(18,2) NOT NULL,
  "totalDue" DECIMAL(18,2) NOT NULL,
  "principalPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "interestPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "feesPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "totalPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" "LoanRepaymentScheduleItemStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanRepaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoanRepayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "postedAt" TIMESTAMP(3) NOT NULL,
  "reference" TEXT,
  "channel" "LoanRepaymentChannel" NOT NULL DEFAULT 'MANUAL',
  "allocationJson" JSONB NOT NULL,
  "createdByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LoanRepaymentScheduleItem_loanApplicationId_fkey'
  ) THEN
    ALTER TABLE "LoanRepaymentScheduleItem"
      ADD CONSTRAINT "LoanRepaymentScheduleItem_loanApplicationId_fkey"
      FOREIGN KEY ("loanApplicationId")
      REFERENCES "TenantLoanApplication"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'LoanRepayment_loanApplicationId_fkey'
  ) THEN
    ALTER TABLE "LoanRepayment"
      ADD CONSTRAINT "LoanRepayment_loanApplicationId_fkey"
      FOREIGN KEY ("loanApplicationId")
      REFERENCES "TenantLoanApplication"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LoanRepaymentScheduleItem_tenantId_idx" ON "LoanRepaymentScheduleItem"("tenantId");
CREATE INDEX IF NOT EXISTS "LoanRepaymentScheduleItem_loanApplicationId_idx" ON "LoanRepaymentScheduleItem"("loanApplicationId");
CREATE UNIQUE INDEX IF NOT EXISTS "LoanRepaymentScheduleItem_loanApplicationId_installmentNumber_key"
  ON "LoanRepaymentScheduleItem"("loanApplicationId", "installmentNumber");

CREATE INDEX IF NOT EXISTS "LoanRepayment_tenantId_idx" ON "LoanRepayment"("tenantId");
CREATE INDEX IF NOT EXISTS "LoanRepayment_loanApplicationId_idx" ON "LoanRepayment"("loanApplicationId");
