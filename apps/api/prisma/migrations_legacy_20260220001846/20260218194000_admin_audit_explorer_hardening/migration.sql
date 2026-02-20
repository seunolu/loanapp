DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditStatus') THEN
    CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAIL');
  END IF;
END $$;

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "status" "AuditStatus" NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "before" JSONB,
  ADD COLUMN IF NOT EXISTS "after" JSONB,
  ADD COLUMN IF NOT EXISTS "error" JSONB;

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");
