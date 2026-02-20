-- Credit Decision Orchestrator

ALTER TABLE "TenantLoanApplication"
  ADD COLUMN IF NOT EXISTS "lastRiskScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastRiskDecision" "RiskDecision",
  ADD COLUMN IF NOT EXISTS "lastRiskEvaluatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastRiskEvaluationId" TEXT;

CREATE TABLE IF NOT EXISTS "LoanDecisionPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT,
  "approveThreshold" INTEGER NOT NULL,
  "manualReviewMin" INTEGER NOT NULL,
  "maxExposure" DECIMAL(18,2) NOT NULL,
  "hardBlockFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "allowUnderReviewReeval" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanDecisionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoanDecisionEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" TEXT,
  "decision" TEXT NOT NULL,
  "reasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "inputsJson" JSONB NOT NULL,
  "recommendedLimit" DECIMAL(18,2),
  "recommendedTenorDays" INTEGER,
  CONSTRAINT "LoanDecisionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoanDecisionPolicy_tenantId_isActive_idx"
  ON "LoanDecisionPolicy"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "LoanDecisionPolicy_tenantId_productId_isActive_idx"
  ON "LoanDecisionPolicy"("tenantId", "productId", "isActive");

CREATE INDEX IF NOT EXISTS "LoanDecisionEvent_tenantId_loanApplicationId_idx"
  ON "LoanDecisionEvent"("tenantId", "loanApplicationId");
CREATE UNIQUE INDEX IF NOT EXISTS "LoanDecisionEvent_loanApplicationId_createdAt_key"
  ON "LoanDecisionEvent"("loanApplicationId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoanDecisionEvent_loanApplicationId_fkey'
  ) THEN
    ALTER TABLE "LoanDecisionEvent"
      ADD CONSTRAINT "LoanDecisionEvent_loanApplicationId_fkey"
      FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
