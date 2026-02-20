-- CreateEnum
CREATE TYPE "CollectionsCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PROMISE_TO_PAY', 'BROKEN_PTP', 'RESOLVED', 'CLOSED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "CollectionsStage" AS ENUM ('SOFT', 'FIELD', 'LEGAL');

-- CreateEnum
CREATE TYPE "CollectionsActionType" AS ENUM ('CALL', 'SMS', 'WHATSAPP', 'EMAIL', 'VISIT', 'NOTE', 'PTP_SET', 'PTP_BROKEN', 'DISPUTE', 'WAIVER', 'WRITE_OFF', 'OTHER');

-- CreateEnum
CREATE TYPE "PenaltyRuleKind" AS ENUM ('DAILY_PERCENT', 'FLAT');

-- CreateTable
CREATE TABLE "CollectionsCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanAccountId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CollectionsCaseStatus" NOT NULL DEFAULT 'OPEN',
    "stage" "CollectionsStage" NOT NULL DEFAULT 'SOFT',
    "dpdAtOpen" INTEGER NOT NULL DEFAULT 0,
    "currentDpd" INTEGER NOT NULL DEFAULT 0,
    "outstandingAtOpen" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currentOutstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "assignedToAdminUserId" TEXT,
    "promiseToPayAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionsCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionsAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorAdminUserId" TEXT,
    "type" "CollectionsActionType" NOT NULL,
    "note" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionsAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "PenaltyRuleKind" NOT NULL,
    "rateBpsPerDay" INTEGER,
    "flatAmount" DECIMAL(18,2),
    "graceDays" INTEGER NOT NULL DEFAULT 0,
    "capAmount" DECIMAL(18,2),
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenaltyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPenaltyAccrual" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanAccountId" TEXT NOT NULL,
    "accruedForDate" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPenaltyAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionsCase_tenantId_status_idx" ON "CollectionsCase"("tenantId", "status");
CREATE INDEX "CollectionsCase_tenantId_stage_idx" ON "CollectionsCase"("tenantId", "stage");
CREATE INDEX "CollectionsCase_tenantId_assignedToAdminUserId_status_idx" ON "CollectionsCase"("tenantId", "assignedToAdminUserId", "status");
CREATE INDEX "CollectionsCase_tenantId_currentDpd_idx" ON "CollectionsCase"("tenantId", "currentDpd");
CREATE INDEX "CollectionsCase_tenantId_loanAccountId_status_idx" ON "CollectionsCase"("tenantId", "loanAccountId", "status");

CREATE INDEX "CollectionsAction_tenantId_caseId_createdAt_idx" ON "CollectionsAction"("tenantId", "caseId", "createdAt");
CREATE INDEX "PenaltyRule_tenantId_productId_idx" ON "PenaltyRule"("tenantId", "productId");
CREATE UNIQUE INDEX "TenantPenaltyAccrual_tenantId_loanAccountId_accruedForDate_key" ON "TenantPenaltyAccrual"("tenantId", "loanAccountId", "accruedForDate");
CREATE INDEX "TenantPenaltyAccrual_tenantId_loanAccountId_createdAt_idx" ON "TenantPenaltyAccrual"("tenantId", "loanAccountId", "createdAt");

-- AddForeignKey
ALTER TABLE "CollectionsCase" ADD CONSTRAINT "CollectionsCase_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionsAction" ADD CONSTRAINT "CollectionsAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CollectionsCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PenaltyRule" ADD CONSTRAINT "PenaltyRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "LoanProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantPenaltyAccrual" ADD CONSTRAINT "TenantPenaltyAccrual_loanAccountId_fkey" FOREIGN KEY ("loanAccountId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
