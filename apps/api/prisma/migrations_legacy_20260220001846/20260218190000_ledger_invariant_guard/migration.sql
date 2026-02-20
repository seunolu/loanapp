DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerAccountCode') THEN
    ALTER TYPE "TenantLedgerAccountCode" ADD VALUE IF NOT EXISTS 'CASH';
    ALTER TYPE "TenantLedgerAccountCode" ADD VALUE IF NOT EXISTS 'LOAN_CLEARING';
    ALTER TYPE "TenantLedgerAccountCode" ADD VALUE IF NOT EXISTS 'WALLET_CLEARING';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'TenantLedgerEntry_tenantId_referenceType_referenceId_idx'
  ) THEN
    CREATE INDEX "TenantLedgerEntry_tenantId_referenceType_referenceId_idx"
      ON "TenantLedgerEntry"("tenantId", "referenceType", "referenceId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'TenantLedgerEntry_tenantId_idempotencyKey_key'
  ) THEN
    ALTER TABLE "TenantLedgerEntry"
      ADD CONSTRAINT "TenantLedgerEntry_tenantId_idempotencyKey_key"
      UNIQUE ("tenantId", "idempotencyKey");
  END IF;
END $$;
