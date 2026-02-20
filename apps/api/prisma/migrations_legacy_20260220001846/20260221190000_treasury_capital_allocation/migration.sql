DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutIntentStatus') THEN
    CREATE TYPE "PayoutIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SystemIntegrityStatus') THEN
    CREATE TYPE "SystemIntegrityStatus" AS ENUM ('OK', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CapitalPoolType') THEN
    CREATE TYPE "CapitalPoolType" AS ENUM ('TREASURY', 'INVESTOR', 'CREDIT_LINE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CapitalPoolStatus') THEN
    CREATE TYPE "CapitalPoolStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CapitalAllocationStatus') THEN
    CREATE TYPE "CapitalAllocationStatus" AS ENUM ('RESERVED', 'DEPLOYED', 'RELEASED', 'WRITTEN_OFF');
  END IF;
END $$;

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

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


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

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'INTEGRITY_SCAN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TenantLedgerAccountCode" ADD VALUE IF NOT EXISTS 'CAPITAL_POOL_AVAILABLE';
ALTER TYPE "TenantLedgerAccountCode" ADD VALUE IF NOT EXISTS 'CAPITAL_POOL_DEPLOYED';
ALTER TYPE "TenantLedgerAccountCode" ADD VALUE IF NOT EXISTS 'CAPITAL_POOL_REPAID';
ALTER TYPE "TenantLedgerAccountCode" ADD VALUE IF NOT EXISTS 'CAPITAL_POOL_LOSSES';

-- AlterTable
ALTER TABLE "FraudSignal" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE "PaymentEvent" ADD COLUMN IF NOT EXISTS "normalizedType" TEXT,
ADD COLUMN IF NOT EXISTS "payoutId" TEXT,
ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SystemIntegritySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalLoansChecked" INTEGER NOT NULL,
    "failuresCount" INTEGER NOT NULL,
    "status" "SystemIntegrityStatus" NOT NULL,
    "details" JSONB,

    CONSTRAINT "SystemIntegritySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FraudSignalAggregate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "fraudLevel" "FraudLevel" NOT NULL DEFAULT 'NONE',
    "flags" TEXT[],
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudSignalAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CapitalPool" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CapitalPoolType" NOT NULL,
    "status" "CapitalPoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "externalRef" TEXT,
    "rulesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CapitalPoolBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "available" DECIMAL(18,2) NOT NULL,
    "deployed" DECIMAL(18,2) NOT NULL,
    "repaid" DECIMAL(18,2) NOT NULL,
    "losses" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapitalPoolBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CapitalAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "status" "CapitalAllocationStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deployedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "releasedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "writtenOffAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BorrowerPayoutProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "recipientCode" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowerPayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayoutIntent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PayoutIntentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL,
    "paymentIntentId" TEXT,
    "providerTransferCode" TEXT,
    "providerReference" TEXT,
    "recipientCode" TEXT NOT NULL,
    "metadata" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "lastError" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recipientProfileId" TEXT,

    CONSTRAINT "PayoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemIntegritySnapshot_tenantId_checkedAt_idx" ON "SystemIntegritySnapshot"("tenantId", "checkedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemIntegritySnapshot_checkedAt_idx" ON "SystemIntegritySnapshot"("checkedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudSignalAggregate_tenantId_fraudLevel_updatedAt_idx" ON "FraudSignalAggregate"("tenantId", "fraudLevel", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FraudSignalAggregate_tenantId_borrowerId_key" ON "FraudSignalAggregate"("tenantId", "borrowerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BorrowerHold_tenantId_borrowerId_status_idx" ON "BorrowerHold"("tenantId", "borrowerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BorrowerHold_tenantId_createdAt_idx" ON "BorrowerHold"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CapitalPool_tenantId_idx" ON "CapitalPool"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CapitalPool_tenantId_status_idx" ON "CapitalPool"("tenantId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CapitalPool_tenantId_createdAt_idx" ON "CapitalPool"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CapitalPoolBalanceSnapshot_tenantId_poolId_asOfDate_idx" ON "CapitalPoolBalanceSnapshot"("tenantId", "poolId", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CapitalPoolBalanceSnapshot_poolId_asOfDate_key" ON "CapitalPoolBalanceSnapshot"("poolId", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CapitalAllocation_loanApplicationId_key" ON "CapitalAllocation"("loanApplicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CapitalAllocation_tenantId_poolId_idx" ON "CapitalAllocation"("tenantId", "poolId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CapitalAllocation_tenantId_loanApplicationId_idx" ON "CapitalAllocation"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CapitalAllocation_tenantId_status_createdAt_idx" ON "CapitalAllocation"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CapitalAllocation_tenantId_loanApplicationId_key" ON "CapitalAllocation"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BorrowerPayoutProfile_tenantId_createdAt_idx" ON "BorrowerPayoutProfile"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BorrowerPayoutProfile_tenantId_borrowerId_provider_key" ON "BorrowerPayoutProfile"("tenantId", "borrowerId", "provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayoutIntent_tenantId_status_createdAt_idx" ON "PayoutIntent"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayoutIntent_tenantId_loanId_createdAt_idx" ON "PayoutIntent"("tenantId", "loanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayoutIntent_tenantId_idempotencyKey_key" ON "PayoutIntent"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayoutIntent_provider_providerTransferCode_key" ON "PayoutIntent"("provider", "providerTransferCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayoutIntent_provider_providerReference_key" ON "PayoutIntent"("provider", "providerReference");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudSignal_tenantId_borrowerId_createdAt_idx" ON "FraudSignal"("tenantId", "borrowerId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FraudSignal_tenantId_loanApplicationId_createdAt_idx" ON "FraudSignal"("tenantId", "loanApplicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FraudSignalEvent_loanApplicationId_key" ON "FraudSignalEvent"("loanApplicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoanApplicationStatusHistory_tenantId_loanApplicationId_cha_idx" ON "LoanApplicationStatusHistory"("tenantId", "loanApplicationId", "changedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoanRepayment_tenantId_createdAt_idx" ON "LoanRepayment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentEvent_tenantId_payoutId_idx" ON "PaymentEvent"("tenantId", "payoutId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RiskEvaluation_loanApplicationId_key" ON "RiskEvaluation"("loanApplicationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TenantDisbursement_tenantId_createdAt_idx" ON "TenantDisbursement"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TenantLoanApplication_tenantId_status_createdAt_idx" ON "TenantLoanApplication"("tenantId", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CapitalPoolBalanceSnapshot_poolId_fkey') THEN
    ALTER TABLE "CapitalPoolBalanceSnapshot"
      ADD CONSTRAINT "CapitalPoolBalanceSnapshot_poolId_fkey"
      FOREIGN KEY ("poolId") REFERENCES "CapitalPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CapitalAllocation_poolId_fkey') THEN
    ALTER TABLE "CapitalAllocation"
      ADD CONSTRAINT "CapitalAllocation_poolId_fkey"
      FOREIGN KEY ("poolId") REFERENCES "CapitalPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CapitalAllocation_loanApplicationId_fkey') THEN
    ALTER TABLE "CapitalAllocation"
      ADD CONSTRAINT "CapitalAllocation_loanApplicationId_fkey"
      FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayoutIntent_paymentIntentId_fkey') THEN
    ALTER TABLE "PayoutIntent"
      ADD CONSTRAINT "PayoutIntent_paymentIntentId_fkey"
      FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayoutIntent_recipientProfileId_fkey') THEN
    ALTER TABLE "PayoutIntent"
      ADD CONSTRAINT "PayoutIntent_recipientProfileId_fkey"
      FOREIGN KEY ("recipientProfileId") REFERENCES "BorrowerPayoutProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentEvent_payoutId_fkey') THEN
    ALTER TABLE "PaymentEvent"
      ADD CONSTRAINT "PaymentEvent_payoutId_fkey"
      FOREIGN KEY ("payoutId") REFERENCES "PayoutIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

