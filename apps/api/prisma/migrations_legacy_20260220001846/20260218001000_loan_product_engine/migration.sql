DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterestType') THEN
    CREATE TYPE "InterestType" AS ENUM ('FLAT', 'REDUCING');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RepaymentFrequency') THEN
    CREATE TYPE "RepaymentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeeType') THEN
    CREATE TYPE "FeeType" AS ENUM ('FIXED', 'PERCENT_OF_PRINCIPAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeeApplyAt') THEN
    CREATE TYPE "FeeApplyAt" AS ENUM ('UPFRONT', 'PER_INSTALLMENT', 'END');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
    CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LoanProduct" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "minPrincipal" INTEGER NOT NULL,
  "maxPrincipal" INTEGER NOT NULL,
  "minTenorDays" INTEGER NOT NULL,
  "maxTenorDays" INTEGER NOT NULL,
  "interestType" "InterestType" NOT NULL,
  "interestRateBps" INTEGER NOT NULL,
  "repaymentFrequency" "RepaymentFrequency" NOT NULL,
  "graceDays" INTEGER NOT NULL DEFAULT 0,
  "allowEarlyRepayment" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoanProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LoanProductFee" (
  "id" TEXT NOT NULL,
  "loanProductId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "FeeType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "applyAt" "FeeApplyAt" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanProductFee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoanProductFee_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "LoanProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LoanProductVersion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanProductId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshotJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanProductVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoanProductVersion_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "LoanProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LoanProduct_tenantId_idx" ON "LoanProduct"("tenantId");
CREATE INDEX IF NOT EXISTS "LoanProduct_tenantId_status_idx" ON "LoanProduct"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "LoanProduct_tenantId_createdAt_idx" ON "LoanProduct"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoanProductFee_loanProductId_idx" ON "LoanProductFee"("loanProductId");
CREATE INDEX IF NOT EXISTS "LoanProductVersion_tenantId_createdAt_idx" ON "LoanProductVersion"("tenantId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LoanProductVersion_loanProductId_version_key'
  ) THEN
    ALTER TABLE "LoanProductVersion"
      ADD CONSTRAINT "LoanProductVersion_loanProductId_version_key" UNIQUE ("loanProductId", "version");
  END IF;
END $$;
