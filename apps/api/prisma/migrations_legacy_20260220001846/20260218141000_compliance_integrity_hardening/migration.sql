-- AlterTable
ALTER TABLE "IdempotencyKey"
ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
ADD COLUMN IF NOT EXISTS "scope" TEXT,
ADD COLUMN IF NOT EXISTS "response" JSONB;

-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN IF NOT EXISTS "actorRole" TEXT;

-- AlterEnum
DO $$
BEGIN
  IF to_regtype('"IdempotencyStatus"') IS NULL THEN
    CREATE TYPE "IdempotencyStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'IdempotencyStatus'
      AND e.enumlabel = 'FAILED'
  ) THEN
    ALTER TYPE "IdempotencyStatus" ADD VALUE 'FAILED';
  END IF;
END $$;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_tenantId_scope_key_key"
ON "IdempotencyKey"("tenantId", "scope", "key");

CREATE INDEX IF NOT EXISTS "IdempotencyKey_tenantId_scope_createdAt_idx"
ON "IdempotencyKey"("tenantId", "scope", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_actorType_actorId_idx"
ON "AuditLog"("actorType", "actorId");

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx"
ON "AuditLog"("entityType", "entityId");

