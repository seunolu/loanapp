DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LedgerAccountType'
      AND e.enumlabel = 'REVENUE'
  ) THEN
    ALTER TYPE "LedgerAccountType" ADD VALUE 'REVENUE';
  END IF;
END $$;

ALTER TABLE "LedgerAccount"
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LedgerAccount_code_key'
  ) THEN
    ALTER TABLE "LedgerAccount" DROP CONSTRAINT "LedgerAccount_code_key";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LedgerAccount_tenantId_code_key'
  ) THEN
    ALTER TABLE "LedgerAccount"
    ADD CONSTRAINT "LedgerAccount_tenantId_code_key" UNIQUE ("tenantId", "code");
  END IF;
END $$;

ALTER TABLE "JournalEntry"
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "referenceType" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN IF NOT EXISTS "referenceId" TEXT,
ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

ALTER TABLE "JournalLine"
ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "accountId" TEXT,
ADD COLUMN IF NOT EXISTS "debitMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "creditMinor" INTEGER NOT NULL DEFAULT 0;

UPDATE "JournalLine"
SET "accountId" = "ledgerAccountId"
WHERE "accountId" IS NULL;

UPDATE "JournalLine"
SET "debitMinor" = CASE WHEN "entryType" = 'DEBIT' THEN "amountKobo" ELSE 0 END,
    "creditMinor" = CASE WHEN "entryType" = 'CREDIT' THEN "amountKobo" ELSE 0 END
WHERE "debitMinor" = 0 AND "creditMinor" = 0;

UPDATE "JournalLine" jl
SET "tenantId" = je."tenantId"
FROM "JournalEntry" je
WHERE jl."journalEntryId" = je."id"
  AND jl."tenantId" = '';

CREATE INDEX IF NOT EXISTS "JournalEntry_tenantId_createdAt_idx" ON "JournalEntry"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "JournalLine_tenantId_createdAt_idx" ON "JournalLine"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "JournalLine_accountId_idx" ON "JournalLine"("accountId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'JournalLine_accountId_fkey'
  ) THEN
    ALTER TABLE "JournalLine"
    ADD CONSTRAINT "JournalLine_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
