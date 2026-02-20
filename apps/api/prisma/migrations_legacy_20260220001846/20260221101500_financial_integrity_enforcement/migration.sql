ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'INTEGRITY_SCAN';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SystemIntegrityStatus') THEN
    CREATE TYPE "SystemIntegrityStatus" AS ENUM ('OK', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SystemIntegritySnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalLoansChecked" INTEGER NOT NULL,
  "failuresCount" INTEGER NOT NULL,
  "status" "SystemIntegrityStatus" NOT NULL,
  "details" JSONB,
  CONSTRAINT "SystemIntegritySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SystemIntegritySnapshot_tenantId_checkedAt_idx"
ON "SystemIntegritySnapshot"("tenantId", "checkedAt");

CREATE INDEX IF NOT EXISTS "SystemIntegritySnapshot_checkedAt_idx"
ON "SystemIntegritySnapshot"("checkedAt");
