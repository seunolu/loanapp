-- Event-driven architecture foundation: domain outbox + consumer state + read model

CREATE TABLE IF NOT EXISTS "OutboxEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "publishAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastPublishError" TEXT,
  "traceId" TEXT,
  "causationId" TEXT,
  "correlationId" TEXT,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OutboxEvent_tenantId_createdAt_idx" ON "OutboxEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_aggregateType_aggregateId_createdAt_idx" ON "OutboxEvent"("aggregateType", "aggregateId", "createdAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_eventType_createdAt_idx" ON "OutboxEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_publishedAt_createdAt_idx" ON "OutboxEvent"("publishedAt", "createdAt");

CREATE TABLE IF NOT EXISTS "EventConsumerCheckpoint" (
  "id" TEXT NOT NULL,
  "consumerName" TEXT NOT NULL,
  "stream" TEXT NOT NULL,
  "group" TEXT NOT NULL,
  "lastMessageId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventConsumerCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventConsumerCheckpoint_consumerName_key" ON "EventConsumerCheckpoint"("consumerName");

CREATE TABLE IF NOT EXISTS "ProcessedEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "consumerName" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcessedEvent_eventId_consumerName_key" ON "ProcessedEvent"("eventId", "consumerName");
CREATE INDEX IF NOT EXISTS "ProcessedEvent_consumerName_processedAt_idx" ON "ProcessedEvent"("consumerName", "processedAt");

CREATE TABLE IF NOT EXISTS "LoanApplicationReadModel" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "borrowerName" TEXT,
  "amountRequested" DECIMAL(18,2),
  "amount" INTEGER,
  "tenorMonths" INTEGER,
  "productCode" TEXT,
  "riskBand" TEXT,
  CONSTRAINT "LoanApplicationReadModel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoanApplicationReadModel_tenantId_createdAt_idx" ON "LoanApplicationReadModel"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoanApplicationReadModel_tenantId_status_createdAt_idx" ON "LoanApplicationReadModel"("tenantId", "status", "createdAt");
