/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,providerReference]` on the table `TenantDisbursement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BorrowerHold" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FraudSignalAggregate" ALTER COLUMN "flags" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LoanDecisionEvent" ALTER COLUMN "reasonCodes" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LoanDecisionPolicy" ALTER COLUMN "hardBlockFlags" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReconciliationJobRun" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReconciliationRecord" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SettlementBatch" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TenantLedgerAccount" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_providerReference_key"
ON "TenantDisbursement"("tenantId", "providerReference")
WHERE ("providerReference" IS NOT NULL);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TenantLoanApplication_tenantId_deviceId_idx"
ON "TenantLoanApplication"("tenantId", "deviceId");

-- RenameIndex
ALTER INDEX "LoanApplicationRiskAssessmentHistory_tenantId_loanApplicationId" RENAME TO "LoanApplicationRiskAssessmentHistory_tenantId_loanApplicati_idx";

-- RenameIndex
ALTER INDEX "ReconciliationRecord_tenantId_provider_referenceType_referenceI" RENAME TO "ReconciliationRecord_tenantId_provider_referenceType_refere_key";
