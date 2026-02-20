-- Risk & Fraud Controls Engine

DO $$ BEGIN
  CREATE TYPE "RiskDecision" AS ENUM ('PASS', 'REVIEW', 'BLOCK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RiskHoldType" AS ENUM (
    'FRAUD_SUSPECTED',
    'KYC_MISSING',
    'DOCUMENTS_MISSING',
    'POLICY_VIOLATION',
    'MANUAL_REVIEW',
    'COLLECTIONS_REVIEW',
    'SYSTEM_VELOCITY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "TenantLoanApplication"
ADD COLUMN IF NOT EXISTS "deviceId" TEXT;

CREATE TABLE IF NOT EXISTS "LoanApplicationRiskAssessment" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL UNIQUE,
  "score" INTEGER NOT NULL,
  "decision" "RiskDecision" NOT NULL,
  "reasons" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByAdminId" TEXT
);

CREATE INDEX IF NOT EXISTS "LoanApplicationRiskAssessment_tenantId_createdAt_idx"
ON "LoanApplicationRiskAssessment" ("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "LoanApplicationRiskAssessment_tenantId_decision_idx"
ON "LoanApplicationRiskAssessment" ("tenantId", "decision");

CREATE TABLE IF NOT EXISTS "LoanApplicationRiskAssessmentHistory" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "decision" "RiskDecision" NOT NULL,
  "reasons" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByAdminId" TEXT
);

CREATE INDEX IF NOT EXISTS "LoanApplicationRiskAssessmentHistory_tenantId_loanApplicationId_createdAt_idx"
ON "LoanApplicationRiskAssessmentHistory" ("tenantId", "loanApplicationId", "createdAt");

CREATE TABLE IF NOT EXISTS "LoanApplicationHold" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "type" "RiskHoldType" NOT NULL,
  "note" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByAdminId" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByAdminId" TEXT,
  "resolutionNote" TEXT
);

CREATE INDEX IF NOT EXISTS "LoanApplicationHold_tenantId_loanApplicationId_idx"
ON "LoanApplicationHold" ("tenantId", "loanApplicationId");

CREATE INDEX IF NOT EXISTS "LoanApplicationHold_tenantId_isActive_idx"
ON "LoanApplicationHold" ("tenantId", "isActive");

DO $$ BEGIN
  ALTER TABLE "LoanApplicationRiskAssessment"
  ADD CONSTRAINT "LoanApplicationRiskAssessment_loanApplicationId_fkey"
  FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LoanApplicationRiskAssessmentHistory"
  ADD CONSTRAINT "LoanApplicationRiskAssessmentHistory_loanApplicationId_fkey"
  FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LoanApplicationHold"
  ADD CONSTRAINT "LoanApplicationHold_loanApplicationId_fkey"
  FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill baseline assessments for existing loan applications.
INSERT INTO "LoanApplicationRiskAssessment" (
  "id",
  "tenantId",
  "loanApplicationId",
  "score",
  "decision",
  "reasons",
  "createdAt",
  "createdByAdminId"
)
SELECT
  'risk_' || "id",
  "tenantId",
  "id",
  50,
  'REVIEW'::"RiskDecision",
  '[{"code":"BASELINE","message":"Backfilled baseline assessment"}]'::jsonb,
  CURRENT_TIMESTAMP,
  NULL
FROM "TenantLoanApplication"
ON CONFLICT ("loanApplicationId") DO NOTHING;

INSERT INTO "LoanApplicationRiskAssessmentHistory" (
  "id",
  "tenantId",
  "loanApplicationId",
  "score",
  "decision",
  "reasons",
  "createdAt",
  "createdByAdminId"
)
SELECT
  'riskh_' || "id",
  "tenantId",
  "id",
  50,
  'REVIEW'::"RiskDecision",
  '[{"code":"BASELINE","message":"Backfilled baseline assessment"}]'::jsonb,
  CURRENT_TIMESTAMP,
  NULL
FROM "TenantLoanApplication"
ON CONFLICT DO NOTHING;
