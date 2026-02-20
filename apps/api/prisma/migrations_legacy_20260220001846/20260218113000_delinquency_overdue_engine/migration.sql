DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DelinquencyStatus') THEN
    CREATE TYPE "DelinquencyStatus" AS ENUM ('CURRENT', 'OVERDUE', 'CHARGED_OFF');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLoanApplicationStatus') THEN
    ALTER TYPE "TenantLoanApplicationStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
  END IF;
END $$;

ALTER TABLE "TenantLoanApplication"
  ADD COLUMN IF NOT EXISTS "daysPastDue" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overdueAmountCents" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "delinquencyStatus" "DelinquencyStatus" NOT NULL DEFAULT 'CURRENT',
  ADD COLUMN IF NOT EXISTS "lastDelinquencyCalcAt" TIMESTAMP(3);

ALTER TABLE "LoanRepaymentScheduleItem"
  ADD COLUMN IF NOT EXISTS "overdueSince" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isOverdue" BOOLEAN NOT NULL DEFAULT false;

UPDATE "LoanRepaymentScheduleItem"
SET
  "isOverdue" = ("dueDate" < NOW() AND ("totalDue" - "totalPaid") > 0),
  "overdueSince" = CASE
    WHEN ("dueDate" < NOW() AND ("totalDue" - "totalPaid") > 0) THEN COALESCE("overdueSince", "dueDate")
    ELSE NULL
  END;

WITH delinquency AS (
  SELECT
    tla."id" AS "loanApplicationId",
    tla."tenantId" AS "tenantId",
    MIN(CASE WHEN lrs."isOverdue" THEN lrs."dueDate" END) AS "earliestDueDate",
    COALESCE(SUM(CASE WHEN lrs."isOverdue" THEN GREATEST((lrs."totalDue" - lrs."totalPaid"), 0) ELSE 0 END), 0) AS "overdueAmount"
  FROM "TenantLoanApplication" tla
  LEFT JOIN "LoanRepaymentScheduleItem" lrs ON lrs."loanApplicationId" = tla."id"
  GROUP BY tla."id", tla."tenantId"
)
UPDATE "TenantLoanApplication" tla
SET
  "delinquencyStatus" = CASE WHEN d."overdueAmount" > 0 THEN 'OVERDUE'::"DelinquencyStatus" ELSE 'CURRENT'::"DelinquencyStatus" END,
  "overdueAmountCents" = ROUND(d."overdueAmount" * 100)::BIGINT,
  "daysPastDue" = CASE
    WHEN d."earliestDueDate" IS NULL THEN 0
    ELSE GREATEST(FLOOR(EXTRACT(EPOCH FROM (NOW() - d."earliestDueDate")) / 86400), 0)::INTEGER
  END,
  "lastDelinquencyCalcAt" = NOW()
FROM delinquency d
WHERE d."loanApplicationId" = tla."id";
