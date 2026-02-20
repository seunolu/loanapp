-- CreateEnum
CREATE TYPE "ReconciliationRunType" AS ENUM ('PAYMENT', 'DISBURSEMENT', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReconciliationIssueCategory" AS ENUM ('MISSING_LEDGER', 'DUPLICATE_LEDGER', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'UNKNOWN_REFERENCE', 'FEE_MISMATCH');

-- CreateEnum
CREATE TYPE "ReconciliationIssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReconciliationEntityType" AS ENUM ('PAYMENT', 'DISBURSEMENT');

-- CreateEnum
CREATE TYPE "ReconciliationIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED');

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ReconciliationRunType" NOT NULL,
    "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "triggeredByAdminId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationIssue" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "ReconciliationIssueCategory" NOT NULL,
    "severity" "ReconciliationIssueSeverity" NOT NULL,
    "entityType" "ReconciliationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "providerRef" TEXT,
    "expected" JSONB,
    "actual" JSONB,
    "expectedHash" TEXT NOT NULL,
    "status" "ReconciliationIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "acknowledgedByAdminId" TEXT,
    "resolvedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconciliationRun_tenantId_type_status_idx" ON "ReconciliationRun"("tenantId", "type", "status");

-- CreateIndex
CREATE INDEX "ReconciliationRun_tenantId_startedAt_idx" ON "ReconciliationRun"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "ReconciliationIssue_tenantId_status_idx" ON "ReconciliationIssue"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationIssue_tenantId_providerRef_idx" ON "ReconciliationIssue"("tenantId", "providerRef");

-- CreateIndex
CREATE INDEX "ReconciliationIssue_runId_idx" ON "ReconciliationIssue"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationIssue_tenantId_category_entityType_entityId_providerRef_expectedHash_key" ON "ReconciliationIssue"("tenantId", "category", "entityType", "entityId", "providerRef", "expectedHash");

-- AddForeignKey
ALTER TABLE "ReconciliationIssue" ADD CONSTRAINT "ReconciliationIssue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
