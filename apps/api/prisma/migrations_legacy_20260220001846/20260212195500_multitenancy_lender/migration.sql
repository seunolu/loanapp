-- Issue 034: Multi-tenant foundation (lender organizations)
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LenderStatus') THEN
    CREATE TYPE "LenderStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Lender" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "LenderStatus" NOT NULL DEFAULT 'ACTIVE',
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lender_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Lender_slug_key" ON "Lender"("slug");

INSERT INTO "Lender" ("id", "name", "slug", "status", "settings")
VALUES ('lender_default', 'Default Lender', 'default', 'ACTIVE', '{}'::jsonb)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "Borrower" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "OtpChallenge" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "KycCase" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "LoanApplication" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "LoanOffer" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "Disbursement" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;

UPDATE "AdminUser" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;
UPDATE "Borrower" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;
UPDATE "OtpChallenge" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;
UPDATE "KycCase" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;
UPDATE "LoanApplication" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;
UPDATE "LoanOffer" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;
UPDATE "Loan" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;
UPDATE "Payment" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;
UPDATE "Disbursement" SET "lenderId" = 'lender_default' WHERE "lenderId" IS NULL;

ALTER TABLE "AdminUser" ALTER COLUMN "lenderId" SET NOT NULL;
ALTER TABLE "Borrower" ALTER COLUMN "lenderId" SET NOT NULL;
ALTER TABLE "OtpChallenge" ALTER COLUMN "lenderId" SET NOT NULL;
ALTER TABLE "KycCase" ALTER COLUMN "lenderId" SET NOT NULL;
ALTER TABLE "LoanApplication" ALTER COLUMN "lenderId" SET NOT NULL;
ALTER TABLE "LoanOffer" ALTER COLUMN "lenderId" SET NOT NULL;
ALTER TABLE "Loan" ALTER COLUMN "lenderId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "lenderId" SET NOT NULL;
ALTER TABLE "Disbursement" ALTER COLUMN "lenderId" SET NOT NULL;

ALTER TABLE "AdminUser" DROP CONSTRAINT IF EXISTS "AdminUser_email_key";
ALTER TABLE "Borrower" DROP CONSTRAINT IF EXISTS "Borrower_phone_key";

CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_lenderId_email_key" ON "AdminUser"("lenderId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "Borrower_lenderId_phone_key" ON "Borrower"("lenderId", "phone");

CREATE INDEX IF NOT EXISTS "AdminUser_lenderId_idx" ON "AdminUser"("lenderId");
CREATE INDEX IF NOT EXISTS "Borrower_lenderId_idx" ON "Borrower"("lenderId");
CREATE INDEX IF NOT EXISTS "OtpChallenge_lenderId_idx" ON "OtpChallenge"("lenderId");
CREATE INDEX IF NOT EXISTS "KycCase_lenderId_idx" ON "KycCase"("lenderId");
CREATE INDEX IF NOT EXISTS "LoanApplication_lenderId_status_idx" ON "LoanApplication"("lenderId", "status");
CREATE INDEX IF NOT EXISTS "LoanOffer_lenderId_status_idx" ON "LoanOffer"("lenderId", "status");
CREATE INDEX IF NOT EXISTS "Loan_lenderId_status_idx" ON "Loan"("lenderId", "status");
CREATE INDEX IF NOT EXISTS "Payment_lenderId_createdAt_idx" ON "Payment"("lenderId", "createdAt");
CREATE INDEX IF NOT EXISTS "Disbursement_lenderId_status_initiatedAt_idx" ON "Disbursement"("lenderId", "status", "initiatedAt");

ALTER TABLE "AdminUser"
  ADD CONSTRAINT "AdminUser_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Borrower"
  ADD CONSTRAINT "Borrower_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OtpChallenge"
  ADD CONSTRAINT "OtpChallenge_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KycCase"
  ADD CONSTRAINT "KycCase_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoanApplication"
  ADD CONSTRAINT "LoanApplication_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoanOffer"
  ADD CONSTRAINT "LoanOffer_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Loan"
  ADD CONSTRAINT "Loan_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Disbursement"
  ADD CONSTRAINT "Disbursement_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

