BEGIN;

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "lenderId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "entityId" TEXT;

UPDATE "AuditLog"
SET "action" = "event"
WHERE "action" IS NULL;

CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_lenderId_createdAt_idx" ON "AuditLog"("lenderId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorType_actorId_createdAt_idx" ON "AuditLog"("actorType", "actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'AuditLog_lenderId_fkey'
      AND table_name = 'AuditLog'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_lenderId_fkey"
      FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

