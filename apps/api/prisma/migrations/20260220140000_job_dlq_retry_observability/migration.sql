-- DLQ + retry observability layer for existing Job queue

CREATE TABLE IF NOT EXISTS "JobDlq" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL,
  "lastError" TEXT NOT NULL,
  "failedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobDlq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobDlq_tenantId_createdAt_idx" ON "JobDlq"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "JobDlq_jobId_idx" ON "JobDlq"("jobId");
CREATE INDEX IF NOT EXISTS "JobDlq_tenantId_type_createdAt_idx" ON "JobDlq"("tenantId", "type", "createdAt");

CREATE INDEX IF NOT EXISTS "Job_tenantId_type_dedupeKey_idx" ON "Job"("tenantId", "type", "dedupeKey");
