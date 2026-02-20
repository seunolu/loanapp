ALTER TABLE "TenantLoanApplication"
  ADD COLUMN IF NOT EXISTS "interestAccrualPaused" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "interestPausedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "interestPausedById" TEXT,
  ADD COLUMN IF NOT EXISTS "interestPauseReason" TEXT,
  ADD COLUMN IF NOT EXISTS "interestOverrideRate" DECIMAL(10,5),
  ADD COLUMN IF NOT EXISTS "interestOverrideSetAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "interestOverrideSetById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterestAccrualAction') THEN
    CREATE TYPE "InterestAccrualAction" AS ENUM ('PAUSED', 'RESUMED', 'RATE_OVERRIDE_SET', 'RATE_OVERRIDE_REMOVED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "InterestAccrualAudit" (
  "id" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "action" "InterestAccrualAction" NOT NULL,
  "previousRate" DECIMAL(10,5),
  "newRate" DECIMAL(10,5),
  "reason" TEXT,
  "performedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterestAccrualAudit_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InterestAccrualAudit_loanApplicationId_fkey'
  ) THEN
    ALTER TABLE "InterestAccrualAudit"
      ADD CONSTRAINT "InterestAccrualAudit_loanApplicationId_fkey"
      FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "InterestAccrualAudit_tenantId_createdAt_idx"
  ON "InterestAccrualAudit"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "InterestAccrualAudit_loanApplicationId_createdAt_idx"
  ON "InterestAccrualAudit"("loanApplicationId", "createdAt");
