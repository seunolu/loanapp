ALTER TABLE "TenantLoanApplication"
ADD COLUMN IF NOT EXISTS "interestPausedUntil" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HardshipStatus') THEN
    CREATE TYPE "HardshipStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HardshipType') THEN
    CREATE TYPE "HardshipType" AS ENUM ('PAYMENT_PAUSE', 'TENOR_EXTENSION', 'RATE_REDUCTION');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "HardshipRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "type" "HardshipType" NOT NULL,
  "reason" TEXT NOT NULL,
  "proposedTenorMonths" INTEGER,
  "proposedRate" DECIMAL(10,5),
  "pauseDays" INTEGER,
  "status" "HardshipStatus" NOT NULL DEFAULT 'REQUESTED',
  "decisionNotes" TEXT,
  "approvedByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "HardshipRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HardshipStatusHistory" (
  "id" TEXT NOT NULL,
  "hardshipRequestId" TEXT NOT NULL,
  "fromStatus" "HardshipStatus" NOT NULL,
  "toStatus" "HardshipStatus" NOT NULL,
  "changedByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HardshipStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HardshipRequest_tenantId_borrowerId_createdAt_idx"
ON "HardshipRequest"("tenantId", "borrowerId", "createdAt");

CREATE INDEX IF NOT EXISTS "HardshipRequest_tenantId_status_createdAt_idx"
ON "HardshipRequest"("tenantId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "HardshipRequest_tenantId_loanApplicationId_status_idx"
ON "HardshipRequest"("tenantId", "loanApplicationId", "status");

CREATE INDEX IF NOT EXISTS "HardshipStatusHistory_hardshipRequestId_createdAt_idx"
ON "HardshipStatusHistory"("hardshipRequestId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HardshipRequest_loanApplicationId_fkey'
  ) THEN
    ALTER TABLE "HardshipRequest"
    ADD CONSTRAINT "HardshipRequest_loanApplicationId_fkey"
    FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HardshipStatusHistory_hardshipRequestId_fkey'
  ) THEN
    ALTER TABLE "HardshipStatusHistory"
    ADD CONSTRAINT "HardshipStatusHistory_hardshipRequestId_fkey"
    FOREIGN KEY ("hardshipRequestId") REFERENCES "HardshipRequest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

