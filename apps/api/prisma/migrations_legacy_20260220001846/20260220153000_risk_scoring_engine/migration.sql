-- Risk & Scoring Engine

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'RiskDecision' AND e.enumlabel = 'PASS'
  ) THEN
    ALTER TYPE "RiskDecision" RENAME VALUE 'PASS' TO 'APPROVE';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'RiskDecision' AND e.enumlabel = 'BLOCK'
  ) THEN
    ALTER TYPE "RiskDecision" RENAME VALUE 'BLOCK' TO 'DECLINE';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskEngineTrigger') THEN
    CREATE TYPE "RiskEngineTrigger" AS ENUM ('AUTO_ON_SUBMISSION', 'MANUAL_ADMIN', 'SYSTEM_REEVAL');
  END IF;
END $$;

ALTER TABLE "TenantLoanApplication"
  ADD COLUMN IF NOT EXISTS "lastRiskScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastRiskDecision" "RiskDecision",
  ADD COLUMN IF NOT EXISTS "lastRiskEvaluatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastRiskEvaluationId" TEXT;

CREATE TABLE IF NOT EXISTS "RiskPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  "configJson" JSONB NOT NULL,
  CONSTRAINT "RiskPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RiskEvaluation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "trigger" "RiskEngineTrigger" NOT NULL,
  "score" INTEGER NOT NULL,
  "decision" "RiskDecision" NOT NULL,
  "reasonsJson" JSONB NOT NULL,
  "inputSnapshotJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  CONSTRAINT "RiskEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RiskPolicy_tenantId_name_version_key"
  ON "RiskPolicy"("tenantId", "name", "version");
CREATE INDEX IF NOT EXISTS "RiskPolicy_tenantId_isActive_idx"
  ON "RiskPolicy"("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "RiskEvaluation_tenantId_loanApplicationId_idx"
  ON "RiskEvaluation"("tenantId", "loanApplicationId");
CREATE INDEX IF NOT EXISTS "RiskEvaluation_tenantId_borrowerId_idx"
  ON "RiskEvaluation"("tenantId", "borrowerId");
CREATE INDEX IF NOT EXISTS "RiskEvaluation_tenantId_createdAt_idx"
  ON "RiskEvaluation"("tenantId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RiskEvaluation_loanApplicationId_fkey'
  ) THEN
    ALTER TABLE "RiskEvaluation"
      ADD CONSTRAINT "RiskEvaluation_loanApplicationId_fkey"
      FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RiskEvaluation_policyId_fkey'
  ) THEN
    ALTER TABLE "RiskEvaluation"
      ADD CONSTRAINT "RiskEvaluation_policyId_fkey"
      FOREIGN KEY ("policyId") REFERENCES "RiskPolicy"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
