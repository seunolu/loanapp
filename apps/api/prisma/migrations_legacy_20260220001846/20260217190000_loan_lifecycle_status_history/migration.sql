-- Expand existing enums to lifecycle statuses
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'REQUESTED_DOCUMENTS';
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'DISBURSED';
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'REPAID';
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'DEFAULTED';

ALTER TYPE "TenantLoanApplicationStatus" ADD VALUE IF NOT EXISTS 'REQUESTED_DOCUMENTS';
ALTER TYPE "TenantLoanApplicationStatus" ADD VALUE IF NOT EXISTS 'REPAID';
ALTER TYPE "TenantLoanApplicationStatus" ADD VALUE IF NOT EXISTS 'DEFAULTED';

CREATE TABLE "LoanApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "fromStatus" "TenantLoanApplicationStatus",
    "toStatus" "TenantLoanApplicationStatus" NOT NULL,
    "note" TEXT,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoanApplicationStatusHistory_tenantId_idx" ON "LoanApplicationStatusHistory"("tenantId");
CREATE INDEX "LoanApplicationStatusHistory_loanApplicationId_idx" ON "LoanApplicationStatusHistory"("loanApplicationId");
CREATE INDEX "LoanApplicationStatusHistory_loanApplicationId_changedAt_idx" ON "LoanApplicationStatusHistory"("loanApplicationId", "changedAt");

ALTER TABLE "LoanApplicationStatusHistory"
ADD CONSTRAINT "LoanApplicationStatusHistory_loanApplicationId_fkey"
FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one baseline history record for existing rows
INSERT INTO "LoanApplicationStatusHistory" (
    "id",
    "tenantId",
    "loanApplicationId",
    "fromStatus",
    "toStatus",
    "note",
    "changedByUserId",
    "changedAt"
)
SELECT
    ('backfill_' || tla."id"),
    tla."tenantId",
    tla."id",
    NULL,
    tla."status",
    'Backfilled initial status',
    NULL,
    tla."createdAt"
FROM "TenantLoanApplication" tla
WHERE NOT EXISTS (
    SELECT 1
    FROM "LoanApplicationStatusHistory" lash
    WHERE lash."loanApplicationId" = tla."id"
);
