DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLoanApplicationStatus') THEN
    ALTER TYPE "TenantLoanApplicationStatus" ADD VALUE IF NOT EXISTS 'WRITTEN_OFF';
    ALTER TYPE "TenantLoanApplicationStatus" ADD VALUE IF NOT EXISTS 'SETTLED';
  END IF;
END $$;

ALTER TABLE "TenantLoanApplication"
  ADD COLUMN IF NOT EXISTS "delinquencyBucket" TEXT,
  ADD COLUMN IF NOT EXISTS "totalPenaltyAccrued" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalPenaltyPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastPenaltyAccrualDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "writtenOffAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3);

UPDATE "TenantLoanApplication"
SET "delinquencyBucket" = CASE
  WHEN "daysPastDue" <= 0 THEN 'CURRENT'
  WHEN "daysPastDue" BETWEEN 1 AND 30 THEN 'DPD_1_30'
  WHEN "daysPastDue" BETWEEN 31 AND 60 THEN 'DPD_31_60'
  WHEN "daysPastDue" BETWEEN 61 AND 90 THEN 'DPD_61_90'
  ELSE 'DPD_90_PLUS'
END
WHERE "delinquencyBucket" IS NULL;

CREATE TABLE IF NOT EXISTS "DelinquencyEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "dpd" INTEGER NOT NULL,
  "bucket" TEXT NOT NULL,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DelinquencyEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollectionActivity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "note" TEXT,
  "performedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionActivity_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DelinquencyEvent_loanId_fkey'
  ) THEN
    ALTER TABLE "DelinquencyEvent"
      ADD CONSTRAINT "DelinquencyEvent_loanId_fkey"
      FOREIGN KEY ("loanId") REFERENCES "TenantLoanApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CollectionActivity_loanId_fkey'
  ) THEN
    ALTER TABLE "CollectionActivity"
      ADD CONSTRAINT "CollectionActivity_loanId_fkey"
      FOREIGN KEY ("loanId") REFERENCES "TenantLoanApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "DelinquencyEvent_tenantId_idx" ON "DelinquencyEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "DelinquencyEvent_loanId_idx" ON "DelinquencyEvent"("loanId");
CREATE INDEX IF NOT EXISTS "CollectionActivity_tenantId_idx" ON "CollectionActivity"("tenantId");
CREATE INDEX IF NOT EXISTS "CollectionActivity_loanId_idx" ON "CollectionActivity"("loanId");
