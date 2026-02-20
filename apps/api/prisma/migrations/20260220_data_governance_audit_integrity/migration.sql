-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('ADMIN', 'BORROWER', 'SYSTEM', 'TENANT_ADMIN');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "chainId" TEXT NOT NULL,
ADD COLUMN     "diffJson" JSONB,
ADD COLUMN     "hash" TEXT NOT NULL,
ADD COLUMN     "prevHash" TEXT,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "resourceType" TEXT,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
ADD COLUMN     "signatureVersion" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "actorType",
ADD COLUMN     "actorType" "AuditActorType" NOT NULL;

-- CreateTable
CREATE TABLE "AuditChainState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "lastHash" TEXT,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditChainState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditChainState_tenantId_key" ON "AuditChainState"("tenantId");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_action_createdAt_idx" ON "AuditEvent"("tenantId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_resourceType_resourceId_createdAt_idx" ON "AuditEvent"("tenantId", "resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_requestId_idx" ON "AuditEvent"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_chainId_sequence_key" ON "AuditEvent"("chainId", "sequence");

