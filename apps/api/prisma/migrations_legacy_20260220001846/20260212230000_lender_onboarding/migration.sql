BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LenderOnboardingStatus') THEN
    CREATE TYPE "LenderOnboardingStatus" AS ENUM ('PENDING', 'COMPLETED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'AdminRole' AND e.enumlabel = 'PLATFORM_SUPER_ADMIN'
  ) THEN
    ALTER TYPE "AdminRole" ADD VALUE 'PLATFORM_SUPER_ADMIN';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'AdminRole' AND e.enumlabel = 'OWNER'
  ) THEN
    ALTER TYPE "AdminRole" ADD VALUE 'OWNER';
  END IF;
END $$;

ALTER TABLE "Lender" ADD COLUMN IF NOT EXISTS "onboardingStatus" "LenderOnboardingStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Lender" ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMP(3);

ALTER TABLE "AdminUser" ALTER COLUMN "lenderId" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "AdminInviteToken" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminInviteToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminInviteToken_tokenHash_key" ON "AdminInviteToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "AdminInviteToken_adminUserId_expiresAt_idx" ON "AdminInviteToken"("adminUserId", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'AdminInviteToken_adminUserId_fkey'
      AND table_name = 'AdminInviteToken'
  ) THEN
    ALTER TABLE "AdminInviteToken"
      ADD CONSTRAINT "AdminInviteToken_adminUserId_fkey"
      FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

