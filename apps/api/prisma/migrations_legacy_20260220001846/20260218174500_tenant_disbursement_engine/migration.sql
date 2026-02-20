DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLoanApplicationStatus') THEN
    ALTER TYPE "TenantLoanApplicationStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_DISBURSEMENT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantDisbursementMethod') THEN
    ALTER TYPE "TenantDisbursementMethod" ADD VALUE IF NOT EXISTS 'MANUAL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantDisbursementStatus') THEN
    CREATE TYPE "TenantDisbursementStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantDisbursementActorType') THEN
    CREATE TYPE "TenantDisbursementActorType" AS ENUM ('ADMIN', 'SYSTEM');
  END IF;
END $$;

ALTER TABLE "TenantDisbursement"
  ADD COLUMN IF NOT EXISTS "status" "TenantDisbursementStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "providerReference" TEXT,
  ADD COLUMN IF NOT EXISTS "initiatedByAdminId" TEXT,
  ADD COLUMN IF NOT EXISTS "initiatedBySystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "TenantDisbursement"
  ALTER COLUMN "disbursedAt" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "TenantDisbursementStatusHistory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "disbursementId" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "fromStatus" "TenantDisbursementStatus",
  "toStatus" "TenantDisbursementStatus" NOT NULL,
  "note" TEXT,
  "actorType" "TenantDisbursementActorType" NOT NULL,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantDisbursementStatusHistory_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TenantDisbursementStatusHistory_disbursementId_fkey'
  ) THEN
    ALTER TABLE "TenantDisbursementStatusHistory"
      ADD CONSTRAINT "TenantDisbursementStatusHistory_disbursementId_fkey"
      FOREIGN KEY ("disbursementId") REFERENCES "TenantDisbursement"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TenantDisbursementStatusHistory_loanId_fkey'
  ) THEN
    ALTER TABLE "TenantDisbursementStatusHistory"
      ADD CONSTRAINT "TenantDisbursementStatusHistory_loanId_fkey"
      FOREIGN KEY ("loanId") REFERENCES "TenantLoanApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "TenantDisbursement"
SET "status" = CASE WHEN "disbursedAt" IS NULL THEN 'PENDING'::"TenantDisbursementStatus" ELSE 'SUCCESS'::"TenantDisbursementStatus" END
WHERE "status" = 'PENDING'::"TenantDisbursementStatus";

CREATE UNIQUE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_providerReference_key"
  ON "TenantDisbursement"("tenantId", "providerReference")
  WHERE "providerReference" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_status_idx"
  ON "TenantDisbursement"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_loanApplicationId_idx"
  ON "TenantDisbursement"("tenantId", "loanApplicationId");

CREATE INDEX IF NOT EXISTS "TenantDisbursementStatusHistory_tenantId_createdAt_idx"
  ON "TenantDisbursementStatusHistory"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "TenantDisbursementStatusHistory_disbursementId_createdAt_idx"
  ON "TenantDisbursementStatusHistory"("disbursementId", "createdAt");
CREATE INDEX IF NOT EXISTS "TenantDisbursementStatusHistory_loanId_createdAt_idx"
  ON "TenantDisbursementStatusHistory"("loanId", "createdAt");
