ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "jti" TEXT,
  ADD COLUMN IF NOT EXISTS "rootJti" TEXT,
  ADD COLUMN IF NOT EXISTS "replacedByJti" TEXT,
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
  ADD COLUMN IF NOT EXISTS "deviceId" TEXT,
  ADD COLUMN IF NOT EXISTS "revokedReason" TEXT;

UPDATE "Session"
SET
  "jti" = COALESCE("jti", "id"),
  "rootJti" = COALESCE("rootJti", "id"),
  "tenantId" = COALESCE(
    "tenantId",
    (
      SELECT "lenderId"
      FROM "Borrower"
      WHERE "Borrower"."id" = "Session"."borrowerId"
    )
  );

ALTER TABLE "Session"
  ALTER COLUMN "jti" SET NOT NULL,
  ALTER COLUMN "rootJti" SET NOT NULL,
  ALTER COLUMN "tenantId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Session_jti_key" ON "Session"("jti");
CREATE INDEX IF NOT EXISTS "Session_jti_idx" ON "Session"("jti");
CREATE INDEX IF NOT EXISTS "Session_rootJti_idx" ON "Session"("rootJti");
CREATE INDEX IF NOT EXISTS "Session_tenantId_borrowerId_deviceId_idx" ON "Session"("tenantId", "borrowerId", "deviceId");

