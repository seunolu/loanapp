CREATE TYPE "BlacklistEntryType" AS ENUM ('PHONE', 'BVN_LAST4', 'DEVICE_ID', 'IP');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "Device" (
  "id" TEXT NOT NULL,
  "lenderId" TEXT NOT NULL,
  "borrowerId" TEXT,
  "deviceId" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "fingerprint" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BorrowerRiskProfile" (
  "id" TEXT NOT NULL,
  "lenderId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "level" "RiskLevel" NOT NULL DEFAULT 'LOW',
  "lastEvaluatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BorrowerRiskProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlacklistEntry" (
  "id" TEXT NOT NULL,
  "lenderId" TEXT,
  "type" "BlacklistEntryType" NOT NULL,
  "value" TEXT NOT NULL,
  "reason" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlacklistEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskEvent" (
  "id" TEXT NOT NULL,
  "lenderId" TEXT NOT NULL,
  "borrowerId" TEXT,
  "deviceId" TEXT,
  "eventType" TEXT NOT NULL,
  "scoreDelta" INTEGER NOT NULL,
  "totalScore" INTEGER NOT NULL,
  "level" "RiskLevel" NOT NULL,
  "blocked" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Device_lenderId_deviceId_key" ON "Device"("lenderId", "deviceId");
CREATE INDEX "Device_borrowerId_lastSeenAt_idx" ON "Device"("borrowerId", "lastSeenAt");
CREATE UNIQUE INDEX "BorrowerRiskProfile_borrowerId_key" ON "BorrowerRiskProfile"("borrowerId");
CREATE INDEX "BorrowerRiskProfile_lenderId_level_idx" ON "BorrowerRiskProfile"("lenderId", "level");
CREATE UNIQUE INDEX "BlacklistEntry_lenderId_type_value_key" ON "BlacklistEntry"("lenderId", "type", "value");
CREATE INDEX "BlacklistEntry_type_value_isActive_idx" ON "BlacklistEntry"("type", "value", "isActive");
CREATE INDEX "RiskEvent_lenderId_createdAt_idx" ON "RiskEvent"("lenderId", "createdAt");
CREATE INDEX "RiskEvent_borrowerId_createdAt_idx" ON "RiskEvent"("borrowerId", "createdAt");
CREATE INDEX "RiskEvent_eventType_createdAt_idx" ON "RiskEvent"("eventType", "createdAt");

ALTER TABLE "Device"
ADD CONSTRAINT "Device_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device"
ADD CONSTRAINT "Device_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BorrowerRiskProfile"
ADD CONSTRAINT "BorrowerRiskProfile_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BorrowerRiskProfile"
ADD CONSTRAINT "BorrowerRiskProfile_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlacklistEntry"
ADD CONSTRAINT "BlacklistEntry_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RiskEvent"
ADD CONSTRAINT "RiskEvent_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskEvent"
ADD CONSTRAINT "RiskEvent_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskEvent"
ADD CONSTRAINT "RiskEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
