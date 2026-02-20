-- External Integrations Layer: webhook observability + worker job type + provider extension.

DO $$
BEGIN
  IF to_regtype('"PaymentProvider"') IS NOT NULL
     AND NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'FLUTTERWAVE'
      AND enumtypid = to_regtype('"PaymentProvider"')
  ) THEN
    ALTER TYPE "PaymentProvider" ADD VALUE 'FLUTTERWAVE';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regtype('"JobType"') IS NOT NULL
     AND NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'PROCESS_WEBHOOK_EVENT'
      AND enumtypid = to_regtype('"JobType"')
  ) THEN
    ALTER TYPE "JobType" ADD VALUE 'PROCESS_WEBHOOK_EVENT';
  END IF;
END $$;

ALTER TABLE "WebhookEvent"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "reference" TEXT,
  ADD COLUMN IF NOT EXISTS "processingError" TEXT;

CREATE INDEX IF NOT EXISTS "WebhookEvent_tenantId_createdAt_idx"
  ON "WebhookEvent"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_providerEventId_idx"
  ON "WebhookEvent"("provider", "providerEventId");

CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_reference_createdAt_idx"
  ON "WebhookEvent"("provider", "reference", "createdAt");
