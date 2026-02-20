ALTER TABLE "LoanRepayment"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

UPDATE "LoanRepayment"
SET "idempotencyKey" = CONCAT('repayment:', "id")
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "LoanRepayment"
  ALTER COLUMN "idempotencyKey" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LoanRepayment_tenantId_idempotencyKey_key'
  ) THEN
    ALTER TABLE "LoanRepayment"
      ADD CONSTRAINT "LoanRepayment_tenantId_idempotencyKey_key"
      UNIQUE ("tenantId", "idempotencyKey");
  END IF;
END $$;
