-- Reconciliation hardening: records + settlement batches + job runs.

DO $$ BEGIN
  CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'MISMATCH', 'SUSPENSE', 'RESOLVED', 'WRITE_OFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReconciliationResolutionType" AS ENUM ('MANUAL_ADJUSTMENT', 'WRITE_OFF', 'PROVIDER_ERROR', 'INTERNAL_ERROR', 'DUPLICATE', 'REFUND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SettlementBatchStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReconciliationJobRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SettlementBatch" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "settlementDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" "SettlementBatchStatus" NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMP(3),
  "closedByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SettlementBatch_tenantId_provider_settlementDate_key"
ON "SettlementBatch" ("tenantId", "provider", "settlementDate");

CREATE INDEX IF NOT EXISTS "SettlementBatch_tenantId_status_settlementDate_idx"
ON "SettlementBatch" ("tenantId", "status", "settlementDate");

CREATE TABLE IF NOT EXISTS "ReconciliationRecord" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "runId" TEXT,
  "provider" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "providerRef" TEXT,
  "settlementBatchId" TEXT,
  "amountMinor" BIGINT NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "ReconciliationStatus" NOT NULL DEFAULT 'MATCHED',
  "mismatchReason" TEXT,
  "suspenseLedgerEntryId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByAdminId" TEXT,
  "resolutionType" "ReconciliationResolutionType",
  "resolutionNote" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReconciliationRecord_tenantId_provider_referenceType_referenceId_key"
ON "ReconciliationRecord" ("tenantId", "provider", "referenceType", "referenceId");

CREATE INDEX IF NOT EXISTS "ReconciliationRecord_tenantId_status_createdAt_idx"
ON "ReconciliationRecord" ("tenantId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "ReconciliationRecord_tenantId_providerRef_idx"
ON "ReconciliationRecord" ("tenantId", "providerRef");

CREATE INDEX IF NOT EXISTS "ReconciliationRecord_tenantId_settlementBatchId_idx"
ON "ReconciliationRecord" ("tenantId", "settlementBatchId");

DO $$ BEGIN
  ALTER TABLE "ReconciliationRecord"
  ADD CONSTRAINT "ReconciliationRecord_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ReconciliationRecord"
  ADD CONSTRAINT "ReconciliationRecord_settlementBatchId_fkey"
  FOREIGN KEY ("settlementBatchId") REFERENCES "SettlementBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ReconciliationResolutionHistory" (
  "id" TEXT PRIMARY KEY,
  "reconciliationId" TEXT NOT NULL,
  "fromStatus" "ReconciliationStatus" NOT NULL,
  "toStatus" "ReconciliationStatus" NOT NULL,
  "resolutionType" "ReconciliationResolutionType",
  "note" TEXT,
  "actedByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ReconciliationResolutionHistory_reconciliationId_createdAt_idx"
ON "ReconciliationResolutionHistory" ("reconciliationId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ReconciliationResolutionHistory"
  ADD CONSTRAINT "ReconciliationResolutionHistory_reconciliationId_fkey"
  FOREIGN KEY ("reconciliationId") REFERENCES "ReconciliationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ReconciliationJobRun" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "dateFrom" TIMESTAMP(3) NOT NULL,
  "dateTo" TIMESTAMP(3) NOT NULL,
  "status" "ReconciliationJobRunStatus" NOT NULL DEFAULT 'RUNNING',
  "matchedCount" INTEGER NOT NULL DEFAULT 0,
  "mismatchCount" INTEGER NOT NULL DEFAULT 0,
  "suspenseCount" INTEGER NOT NULL DEFAULT 0,
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReconciliationJobRun_tenantId_provider_dateFrom_dateTo_key"
ON "ReconciliationJobRun" ("tenantId", "provider", "dateFrom", "dateTo");

CREATE INDEX IF NOT EXISTS "ReconciliationJobRun_tenantId_createdAt_idx"
ON "ReconciliationJobRun" ("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "ReconciliationJobRun_tenantId_status_startedAt_idx"
ON "ReconciliationJobRun" ("tenantId", "status", "startedAt");

-- Backfill records from existing reconciliation issues.
INSERT INTO "ReconciliationRecord" (
  "id",
  "tenantId",
  "runId",
  "provider",
  "referenceType",
  "referenceId",
  "providerRef",
  "status",
  "mismatchReason",
  "resolutionNote",
  "createdAt",
  "updatedAt",
  "metadata"
)
SELECT
  'rec_' || "id",
  "tenantId",
  "runId",
  'PAYSTACK',
  "entityType"::text,
  "entityId",
  NULLIF("providerRef", ''),
  CASE
    WHEN "status" = 'RESOLVED' THEN 'RESOLVED'::"ReconciliationStatus"
    WHEN "category" IN ('MISSING_LEDGER', 'UNKNOWN_REFERENCE') THEN 'SUSPENSE'::"ReconciliationStatus"
    ELSE 'MISMATCH'::"ReconciliationStatus"
  END,
  "category"::text,
  "resolutionNote",
  "createdAt",
  "updatedAt",
  jsonb_build_object('sourceIssueId', "id", 'category', "category"::text, 'severity', "severity"::text)
FROM "ReconciliationIssue"
ON CONFLICT ("tenantId", "provider", "referenceType", "referenceId") DO NOTHING;

