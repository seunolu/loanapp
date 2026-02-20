-- Legacy migration made shadow-db safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'BorrowerOverride'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "BorrowerOverride" ALTER COLUMN "updatedAt" DROP DEFAULT;
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UnderwritingCase'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "UnderwritingCase" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UnderwritingChecklistItem'
      AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "UnderwritingChecklistItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

