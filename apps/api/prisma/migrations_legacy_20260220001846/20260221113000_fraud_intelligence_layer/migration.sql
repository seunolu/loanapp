DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FraudLevel') THEN
    CREATE TYPE "FraudLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HoldStatus') THEN
    CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'RELEASED');
  END IF;
END $$;

ALTER TABLE "FraudSignal"
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'system';

ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'LOGIN_FAILED';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'OTP_FAILED';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'DEVICE_CHANGED';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'MULTIPLE_ACCOUNTS_SUSPECTED';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'BANK_ACCOUNT_CHANGED';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'REPAYMENT_REVERSAL';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'CARD_CHARGEBACK';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'PAYMENT_VELOCITY_SPIKE';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'COLLECTIONS_ESCALATION';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW_REQUESTED';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'ADMIN_OVERRIDE';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'IP_GEO_ANOMALY';

CREATE TABLE IF NOT EXISTS "FraudSignalAggregate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "fraudLevel" "FraudLevel" NOT NULL DEFAULT 'NONE',
  "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "lastEvaluatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FraudSignalAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FraudSignalAggregate_tenantId_borrowerId_key"
ON "FraudSignalAggregate"("tenantId", "borrowerId");
CREATE INDEX IF NOT EXISTS "FraudSignalAggregate_tenantId_fraudLevel_updatedAt_idx"
ON "FraudSignalAggregate"("tenantId", "fraudLevel", "updatedAt");

CREATE TABLE IF NOT EXISTS "BorrowerHold" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdByAdminId" TEXT,
  "createdBySystem" BOOLEAN NOT NULL DEFAULT false,
  "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
  "releasedAt" TIMESTAMP(3),
  "releaseReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BorrowerHold_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BorrowerHold_tenantId_borrowerId_status_idx"
ON "BorrowerHold"("tenantId", "borrowerId", "status");
CREATE INDEX IF NOT EXISTS "BorrowerHold_tenantId_createdAt_idx"
ON "BorrowerHold"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "FraudSignal_tenantId_borrowerId_createdAt_idx"
ON "FraudSignal"("tenantId", "borrowerId", "createdAt");
CREATE INDEX IF NOT EXISTS "FraudSignal_tenantId_loanApplicationId_createdAt_idx"
ON "FraudSignal"("tenantId", "loanApplicationId", "createdAt");
