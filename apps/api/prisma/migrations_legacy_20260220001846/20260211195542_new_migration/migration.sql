DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'LoanOffer'
      AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE "LoanOffer" ALTER COLUMN "expiresAt" DROP DEFAULT;
  END IF;
END $$;
