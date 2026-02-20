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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TenantDisbursement' AND column_name = 'tenantId'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TenantDisbursement' AND column_name = 'providerReference'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_providerReference_key" ON "TenantDisbursement"("tenantId", "providerReference")';
  END IF;
END $$;

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
