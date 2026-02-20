CREATE TABLE IF NOT EXISTS "AuditEvent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestId" TEXT,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" TEXT,
  "tenantId" TEXT,
  "lenderId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "metadataJson" JSONB,
  "idempotencyKey" TEXT,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuditEvent_idempotencyKey_key"
  ON "AuditEvent"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "AuditEvent_tenantId_createdAt_idx"
  ON "AuditEvent"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditEvent_entityType_entityId_idx"
  ON "AuditEvent"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "AuditEvent_action_createdAt_idx"
  ON "AuditEvent"("action", "createdAt");
