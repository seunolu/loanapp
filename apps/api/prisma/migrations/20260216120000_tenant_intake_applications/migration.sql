BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLoanApplicationStatus') THEN
    CREATE TYPE "TenantLoanApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "lenderTitle" TEXT,
  "apiBaseUrl" TEXT,
  "theme" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

CREATE TABLE IF NOT EXISTS "TenantLoanApplication" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "status" "TenantLoanApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "dob" TIMESTAMP(3),
  "address" TEXT,
  "amount" INTEGER NOT NULL,
  "tenorMonths" INTEGER NOT NULL,
  "purpose" TEXT,
  "employmentStatus" TEXT,
  "incomeBand" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantLoanApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TenantLoanApplication_tenantId_idx" ON "TenantLoanApplication"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantLoanApplication_tenantId_createdAt_idx" ON "TenantLoanApplication"("tenantId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantLoanApplication_tenantId_fkey'
  ) THEN
    ALTER TABLE "TenantLoanApplication"
      ADD CONSTRAINT "TenantLoanApplication_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
