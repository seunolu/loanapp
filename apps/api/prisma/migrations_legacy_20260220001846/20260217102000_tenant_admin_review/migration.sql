BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantAdminRole') THEN
    CREATE TYPE "TenantAdminRole" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantLoanApplicationStatus') THEN
    ALTER TYPE "TenantLoanApplicationStatus" ADD VALUE IF NOT EXISTS 'DISBURSED';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TenantAdminUser" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "TenantAdminRole" NOT NULL DEFAULT 'TENANT_ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantAdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantAdminUser_tenantId_email_key" ON "TenantAdminUser"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "TenantAdminUser_tenantId_idx" ON "TenantAdminUser"("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantAdminUser_tenantId_fkey'
  ) THEN
    ALTER TABLE "TenantAdminUser"
      ADD CONSTRAINT "TenantAdminUser_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TenantLoanApplicationEvent" (
  "id" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "fromStatus" "TenantLoanApplicationStatus" NOT NULL,
  "toStatus" "TenantLoanApplicationStatus" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantLoanApplicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TenantLoanApplicationEvent_loanApplicationId_createdAt_idx" ON "TenantLoanApplicationEvent"("loanApplicationId", "createdAt");
CREATE INDEX IF NOT EXISTS "TenantLoanApplicationEvent_adminId_createdAt_idx" ON "TenantLoanApplicationEvent"("adminId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantLoanApplicationEvent_loanApplicationId_fkey'
  ) THEN
    ALTER TABLE "TenantLoanApplicationEvent"
      ADD CONSTRAINT "TenantLoanApplicationEvent_loanApplicationId_fkey"
      FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TenantLoanApplicationEvent_adminId_fkey'
  ) THEN
    ALTER TABLE "TenantLoanApplicationEvent"
      ADD CONSTRAINT "TenantLoanApplicationEvent_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "TenantAdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
