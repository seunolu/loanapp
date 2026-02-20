ALTER TABLE "TenantLoanApplication"
ADD COLUMN IF NOT EXISTS "annualInterestRate" DECIMAL(8,4),
ADD COLUMN IF NOT EXISTS "lastAccruedAt" TIMESTAMP(3);

ALTER TABLE "TenantDisbursement"
ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

UPDATE "TenantDisbursement"
SET "idempotencyKey" = COALESCE(NULLIF("idempotencyKey", ''), "id");

ALTER TABLE "TenantDisbursement"
ALTER COLUMN "idempotencyKey" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantDisbursement_tenantId_idempotencyKey_key'
  ) THEN
    ALTER TABLE "TenantDisbursement"
    ADD CONSTRAINT "TenantDisbursement_tenantId_idempotencyKey_key" UNIQUE ("tenantId", "idempotencyKey");
  END IF;
END $$;

ALTER TABLE "TenantRepayment"
ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

UPDATE "TenantRepayment"
SET "idempotencyKey" = COALESCE(NULLIF("idempotencyKey", ''), "id");

ALTER TABLE "TenantRepayment"
ALTER COLUMN "idempotencyKey" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantRepayment_tenantId_idempotencyKey_key'
  ) THEN
    ALTER TABLE "TenantRepayment"
    ADD CONSTRAINT "TenantRepayment_tenantId_idempotencyKey_key" UNIQUE ("tenantId", "idempotencyKey");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerEntryType') THEN
    CREATE TYPE "TenantLedgerEntryType" AS ENUM ('DISBURSEMENT', 'REPAYMENT', 'ACCRUAL', 'ADJUSTMENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerNormalBalance') THEN
    CREATE TYPE "TenantLedgerNormalBalance" AS ENUM ('DEBIT', 'CREDIT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerAccountCode') THEN
    CREATE TYPE "TenantLedgerAccountCode" AS ENUM (
      'LOAN_PRINCIPAL_RECEIVABLE',
      'INTEREST_RECEIVABLE',
      'FEES_RECEIVABLE',
      'CASH_ON_HAND',
      'BANK_CLEARING',
      'INTEREST_INCOME',
      'FEE_INCOME',
      'SUSPENSE'
    );
  END IF;
END $$;

ALTER TABLE "TenantLedgerAccount"
ADD COLUMN IF NOT EXISTS "code" "TenantLedgerAccountCode",
ADD COLUMN IF NOT EXISTS "normalBalance" "TenantLedgerNormalBalance";

UPDATE "TenantLedgerAccount"
SET "code" = CASE "type"::text
  WHEN 'LOAN_PRINCIPAL' THEN 'LOAN_PRINCIPAL_RECEIVABLE'::"TenantLedgerAccountCode"
  WHEN 'LOAN_INTEREST' THEN 'INTEREST_RECEIVABLE'::"TenantLedgerAccountCode"
  WHEN 'LOAN_FEES' THEN 'FEES_RECEIVABLE'::"TenantLedgerAccountCode"
  WHEN 'CASH' THEN 'CASH_ON_HAND'::"TenantLedgerAccountCode"
  ELSE 'SUSPENSE'::"TenantLedgerAccountCode"
END
WHERE "code" IS NULL;

UPDATE "TenantLedgerAccount"
SET "normalBalance" = CASE
  WHEN "code" IN ('LOAN_PRINCIPAL_RECEIVABLE','INTEREST_RECEIVABLE','FEES_RECEIVABLE','CASH_ON_HAND','BANK_CLEARING','SUSPENSE')
    THEN 'DEBIT'::"TenantLedgerNormalBalance"
  ELSE 'CREDIT'::"TenantLedgerNormalBalance"
END
WHERE "normalBalance" IS NULL;

ALTER TABLE "TenantLedgerAccount"
ALTER COLUMN "code" SET NOT NULL,
ALTER COLUMN "normalBalance" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantLedgerAccount_tenantId_type_key'
  ) THEN
    ALTER TABLE "TenantLedgerAccount"
    DROP CONSTRAINT "TenantLedgerAccount_tenantId_type_key";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantLedgerAccount_tenantId_code_key'
  ) THEN
    ALTER TABLE "TenantLedgerAccount"
    ADD CONSTRAINT "TenantLedgerAccount_tenantId_code_key" UNIQUE ("tenantId", "code");
  END IF;
END $$;

ALTER TABLE "TenantLedgerAccount" DROP COLUMN IF EXISTS "type";

ALTER TABLE "TenantLedgerEntry"
ADD COLUMN IF NOT EXISTS "type" "TenantLedgerEntryType",
ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
ADD COLUMN IF NOT EXISTS "referenceTypeNew" TEXT;

UPDATE "TenantLedgerEntry"
SET "type" = CASE "referenceType"::text
  WHEN 'DISBURSEMENT' THEN 'DISBURSEMENT'::"TenantLedgerEntryType"
  WHEN 'REPAYMENT' THEN 'REPAYMENT'::"TenantLedgerEntryType"
  ELSE 'ADJUSTMENT'::"TenantLedgerEntryType"
END
WHERE "type" IS NULL;

UPDATE "TenantLedgerEntry"
SET "idempotencyKey" = COALESCE(NULLIF("idempotencyKey", ''), "id");

UPDATE "TenantLedgerEntry"
SET "referenceTypeNew" = 'LoanApplication'
WHERE "referenceTypeNew" IS NULL;

ALTER TABLE "TenantLedgerEntry"
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "idempotencyKey" SET NOT NULL,
ALTER COLUMN "referenceTypeNew" SET NOT NULL;

ALTER TABLE "TenantLedgerEntry" DROP COLUMN IF EXISTS "referenceType";
ALTER TABLE "TenantLedgerEntry" RENAME COLUMN "referenceTypeNew" TO "referenceType";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantLedgerEntry_tenantId_type_idempotencyKey_key'
  ) THEN
    ALTER TABLE "TenantLedgerEntry"
    ADD CONSTRAINT "TenantLedgerEntry_tenantId_type_idempotencyKey_key" UNIQUE ("tenantId", "type", "idempotencyKey");
  END IF;
END $$;
