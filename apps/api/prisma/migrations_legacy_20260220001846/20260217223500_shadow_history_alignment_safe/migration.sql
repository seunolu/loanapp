-- Shadow/history alignment migration (safe + idempotent).
-- Purpose: align replayed migration state with current schema without unsafe drops.

-- JournalLine FK can be named differently across environments.
DO $$
BEGIN
  IF to_regclass('"JournalLine"') IS NOT NULL
    AND EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JournalLine_accountId_fkey'
      AND conrelid = to_regclass('"JournalLine"')
  ) THEN
    ALTER TABLE "JournalLine" DROP CONSTRAINT "JournalLine_accountId_fkey";
  END IF;
END $$;

-- Legacy index replacement.
DO $$
BEGIN
  IF to_regclass('"LoanRepayment"') IS NOT NULL THEN
    DROP INDEX IF EXISTS "LoanRepayment_loanApplicationId_idx";
    CREATE INDEX IF NOT EXISTS "LoanRepayment_loanApplicationId_postedAt_idx"
    ON "LoanRepayment"("loanApplicationId", "postedAt");
    CREATE INDEX IF NOT EXISTS "LoanRepayment_tenantId_postedAt_idx"
    ON "LoanRepayment"("tenantId", "postedAt");
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"LoanRepaymentScheduleItem"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "LoanRepaymentScheduleItem_tenantId_dueDate_idx"
    ON "LoanRepaymentScheduleItem"("tenantId", "dueDate");
  END IF;
END $$;

-- This is a UNIQUE CONSTRAINT-backed index in many DBs; drop via constraint if present.
DO $$
BEGIN
  IF to_regclass('"TenantLedgerEntry"') IS NOT NULL
    AND EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantLedgerEntry_tenantId_type_idempotencyKey_key'
      AND conrelid = to_regclass('"TenantLedgerEntry"')
  ) THEN
    ALTER TABLE "TenantLedgerEntry" DROP CONSTRAINT "TenantLedgerEntry_tenantId_type_idempotencyKey_key";
  END IF;
END $$;
DROP INDEX IF EXISTS "TenantLedgerEntry_tenantId_type_idempotencyKey_key";

-- Expected uniqueness/indexes in current schema.
DO $$
BEGIN
  IF to_regclass('"TenantDisbursement"') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'TenantDisbursement'
        AND column_name = 'providerReference'
    )
  THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_providerReference_key"
    ON "TenantDisbursement"("tenantId", "providerReference")
    WHERE "providerReference" IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"TenantLedgerEntry"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "TenantLedgerEntry_referenceType_referenceId_idx"
    ON "TenantLedgerEntry"("referenceType", "referenceId");
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"TenantLoanApplication"') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'TenantLoanApplication'
        AND column_name = 'deviceId'
    )
  THEN
    CREATE INDEX IF NOT EXISTS "TenantLoanApplication_tenantId_deviceId_idx"
    ON "TenantLoanApplication"("tenantId", "deviceId");
  END IF;
END $$;

-- Remove defaults that drifted during earlier migrations.
DO $$ BEGIN
  IF to_regclass('"LoanProduct"') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'LoanProduct' AND column_name = 'updatedAt'
    )
  THEN
    ALTER TABLE "LoanProduct" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
  IF to_regclass('"LoanRepaymentScheduleItem"') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'LoanRepaymentScheduleItem' AND column_name = 'updatedAt'
    )
  THEN
    ALTER TABLE "LoanRepaymentScheduleItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
  IF to_regclass('"ReconciliationJobRun"') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ReconciliationJobRun' AND column_name = 'updatedAt'
    )
  THEN
    ALTER TABLE "ReconciliationJobRun" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
  IF to_regclass('"ReconciliationRecord"') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ReconciliationRecord' AND column_name = 'updatedAt'
    )
  THEN
    ALTER TABLE "ReconciliationRecord" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
  IF to_regclass('"SettlementBatch"') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'SettlementBatch' AND column_name = 'updatedAt'
    )
  THEN
    ALTER TABLE "SettlementBatch" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
  IF to_regclass('"TenantDisbursement"') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'TenantDisbursement' AND column_name = 'updatedAt'
    )
  THEN
    ALTER TABLE "TenantDisbursement" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
  IF to_regclass('"TenantLedgerAccount"') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'TenantLedgerAccount' AND column_name = 'updatedAt'
    )
  THEN
    ALTER TABLE "TenantLedgerAccount" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- Old enums should be removed if unused.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerAccountType')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_type t ON t.oid = a.atttypid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND t.typname = 'TenantLedgerAccountType'
         AND a.attnum > 0
         AND NOT a.attisdropped
     )
  THEN
    DROP TYPE "TenantLedgerAccountType";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerReferenceType')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_type t ON t.oid = a.atttypid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND t.typname = 'TenantLedgerReferenceType'
         AND a.attnum > 0
         AND NOT a.attisdropped
     )
  THEN
    DROP TYPE "TenantLedgerReferenceType";
  END IF;
END $$;

-- Ensure current FK shape.
DO $$
BEGIN
  IF to_regclass('"JournalLine"') IS NOT NULL
    AND to_regclass('"LedgerAccount"') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'JournalLine'
        AND column_name = 'accountId'
    )
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'LedgerAccount'
        AND column_name = 'id'
    )
    AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JournalLine_accountId_fkey'
      AND conrelid = to_regclass('"JournalLine"')
  ) THEN
    ALTER TABLE "JournalLine"
      ADD CONSTRAINT "JournalLine_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
