/*
  Warnings:

  - The values [COMPLETED,DEAD] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [OVERDUE_SCAN,PENALTY_ACCRUAL_DAILY,DAILY_AGGREGATE_BUILD] on the enum `JobType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `deadAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `key` on the `Job` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[dedupeKey]` on the table `Job` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,providerReference]` on the table `TenantDisbursement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Made the column `payload` on table `Job` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');
ALTER TABLE "Job" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Job" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "JobStatus_old";
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "JobType_new" AS ENUM ('ACCRUE_INTEREST', 'RECALC_BALANCES', 'SEND_NOTIFICATION', 'COLLECTIONS_ESCALATION', 'RISK_REEVALUATION', 'LEDGER_RECONCILE');
ALTER TABLE "Job" ALTER COLUMN "type" TYPE "JobType_new" USING ("type"::text::"JobType_new");
ALTER TYPE "JobType" RENAME TO "JobType_old";
ALTER TYPE "JobType_new" RENAME TO "JobType";
DROP TYPE "JobType_old";
COMMIT;

-- DropIndex
DROP INDEX "Job_status_runAt_createdAt_idx";

-- DropIndex
DROP INDEX "Job_type_key_key";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "deadAt",
DROP COLUMN "key",
ADD COLUMN     "backoffMs" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "lenderId" TEXT,
ADD COLUMN     "lockedBy" TEXT,
ADD COLUMN     "succeededAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "payload" SET NOT NULL,
ALTER COLUMN "maxAttempts" SET DEFAULT 10;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LoanDecisionEvent' AND column_name = 'reasonCodes'
  ) THEN
    EXECUTE 'ALTER TABLE "LoanDecisionEvent" ALTER COLUMN "reasonCodes" DROP DEFAULT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LoanDecisionPolicy' AND column_name = 'hardBlockFlags'
  ) THEN
    EXECUTE 'ALTER TABLE "LoanDecisionPolicy" ALTER COLUMN "hardBlockFlags" DROP DEFAULT';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LoanDecisionPolicy' AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "LoanDecisionPolicy" ALTER COLUMN "updatedAt" DROP DEFAULT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ReconciliationJobRun' AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "ReconciliationJobRun" ALTER COLUMN "updatedAt" DROP DEFAULT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ReconciliationRecord' AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "ReconciliationRecord" ALTER COLUMN "updatedAt" DROP DEFAULT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SettlementBatch' AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "SettlementBatch" ALTER COLUMN "updatedAt" DROP DEFAULT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TenantDisbursement' AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "TenantDisbursement" ALTER COLUMN "updatedAt" DROP DEFAULT';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TenantLedgerAccount' AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "TenantLedgerAccount" ALTER COLUMN "updatedAt" DROP DEFAULT';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Job_tenantId_status_runAt_idx" ON "Job"("tenantId", "status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_providerReference_key" ON "TenantDisbursement"("tenantId", "providerReference");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TenantLoanApplication' AND column_name = 'tenantId'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TenantLoanApplication' AND column_name = 'deviceId'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "TenantLoanApplication_tenantId_deviceId_idx" ON "TenantLoanApplication"("tenantId", "deviceId")';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'LoanApplicationRiskAssessmentHistory_tenantId_loanApplicationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'LoanApplicationRiskAssessmentHistory_tenantId_loanApplicati_idx'
  ) THEN
    EXECUTE 'ALTER INDEX "LoanApplicationRiskAssessmentHistory_tenantId_loanApplicationId" RENAME TO "LoanApplicationRiskAssessmentHistory_tenantId_loanApplicati_idx"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ReconciliationIssue_tenantId_category_entityType_entityId_provi'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ReconciliationIssue_tenantId_category_entityType_entityId_p_key'
  ) THEN
    EXECUTE 'ALTER INDEX "ReconciliationIssue_tenantId_category_entityType_entityId_provi" RENAME TO "ReconciliationIssue_tenantId_category_entityType_entityId_p_key"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ReconciliationRecord_tenantId_provider_referenceType_referenceI'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ReconciliationRecord_tenantId_provider_referenceType_refere_key'
  ) THEN
    EXECUTE 'ALTER INDEX "ReconciliationRecord_tenantId_provider_referenceType_referenceI" RENAME TO "ReconciliationRecord_tenantId_provider_referenceType_refere_key"';
  END IF;
END $$;
