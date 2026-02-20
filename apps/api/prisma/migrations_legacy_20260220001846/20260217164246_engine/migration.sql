-- DropForeignKey
DO $$
BEGIN
  IF to_regclass('"JournalLine"') IS NOT NULL THEN
    ALTER TABLE "JournalLine" DROP CONSTRAINT IF EXISTS "JournalLine_accountId_fkey";
  END IF;
END $$;

-- DropIndex
DROP INDEX IF EXISTS "LedgerAccount_code_key";

-- DropIndex
DROP INDEX IF EXISTS "LoanRepayment_loanApplicationId_idx";

-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LoanProduct'
  ) THEN
    ALTER TABLE "LoanProduct" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LoanRepaymentScheduleItem'
  ) THEN
    ALTER TABLE "LoanRepaymentScheduleItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TenantAdminUser'
  ) THEN
    ALTER TABLE "TenantAdminUser" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- DropEnum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerAccountType') THEN
    DROP TYPE "TenantLedgerAccountType";
  END IF;
END $$;

-- DropEnum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLedgerReferenceType') THEN
    DROP TYPE "TenantLedgerReferenceType";
  END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LoanRepayment'
  ) THEN
    CREATE INDEX IF NOT EXISTS "LoanRepayment_loanApplicationId_postedAt_idx"
      ON "LoanRepayment"("loanApplicationId", "postedAt");
  END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LoanRepayment'
  ) THEN
    CREATE INDEX IF NOT EXISTS "LoanRepayment_tenantId_postedAt_idx"
      ON "LoanRepayment"("tenantId", "postedAt");
  END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LoanRepaymentScheduleItem'
  ) THEN
    CREATE INDEX IF NOT EXISTS "LoanRepaymentScheduleItem_tenantId_dueDate_idx"
      ON "LoanRepaymentScheduleItem"("tenantId", "dueDate");
  END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TenantLedgerEntry'
  ) THEN
    CREATE INDEX IF NOT EXISTS "TenantLedgerEntry_referenceType_referenceId_idx"
      ON "TenantLedgerEntry"("referenceType", "referenceId");
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'JournalLine'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'JournalLine'
      AND column_name = 'accountId'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LedgerAccount'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'JournalLine_accountId_fkey'
  ) THEN
    ALTER TABLE "JournalLine"
      ADD CONSTRAINT "JournalLine_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- RenameIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'LoanRepaymentScheduleItem_loanApplicationId_installmentNumber_k'
      AND n.nspname = 'public'
  ) THEN
    ALTER INDEX "LoanRepaymentScheduleItem_loanApplicationId_installmentNumber_k"
      RENAME TO "LoanRepaymentScheduleItem_loanApplicationId_installmentNumb_key";
  END IF;
END $$;
