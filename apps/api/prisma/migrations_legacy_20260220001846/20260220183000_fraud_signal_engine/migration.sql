-- CreateTable
CREATE TABLE "FraudSignalEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signalType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "metadataJson" JSONB NOT NULL,

  CONSTRAINT "FraudSignalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerBlacklist" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "identifierType" TEXT NOT NULL,
  "identifierValue" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BorrowerBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FraudSignalEvent_tenantId_loanApplicationId_idx" ON "FraudSignalEvent"("tenantId", "loanApplicationId");

-- CreateIndex
CREATE INDEX "FraudSignalEvent_tenantId_createdAt_idx" ON "FraudSignalEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerBlacklist_tenantId_identifierType_identifierValue_key"
ON "BorrowerBlacklist"("tenantId", "identifierType", "identifierValue");

-- CreateIndex
CREATE INDEX "BorrowerBlacklist_tenantId_identifierType_idx" ON "BorrowerBlacklist"("tenantId", "identifierType");

-- AddForeignKey
ALTER TABLE "FraudSignalEvent"
ADD CONSTRAINT "FraudSignalEvent_loanApplicationId_fkey"
FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
