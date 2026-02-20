-- Make this migration safe for shadow DBs where Lender does not exist yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'AdminUser_email_key'
      AND n.nspname = 'public'
  ) THEN
    DROP INDEX "AdminUser_email_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'Borrower_phone_key'
      AND n.nspname = 'public'
  ) THEN
    DROP INDEX "Borrower_phone_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Lender'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Lender" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

