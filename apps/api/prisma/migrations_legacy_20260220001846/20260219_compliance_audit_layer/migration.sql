-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "SuspiciousActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,

    CONSTRAINT "SuspiciousActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuspiciousActivity_tenantId_createdAt_idx" ON "SuspiciousActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_tenantId_resolved_createdAt_idx" ON "SuspiciousActivity"("tenantId", "resolved", "createdAt");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_tenantId_entityType_entityId_idx" ON "SuspiciousActivity"("tenantId", "entityType", "entityId");

