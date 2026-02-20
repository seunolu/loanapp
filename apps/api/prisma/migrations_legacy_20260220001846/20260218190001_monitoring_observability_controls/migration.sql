-- Compliance hardening: tenant feature flags
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_tenantId_key_key"
  ON "FeatureFlag"("tenantId", "key");

CREATE INDEX IF NOT EXISTS "FeatureFlag_tenantId_key_enabled_idx"
  ON "FeatureFlag"("tenantId", "key", "enabled");
