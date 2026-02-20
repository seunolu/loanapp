-- CreateEnum
CREATE TYPE "SupportActionType" AS ENUM ('PAUSE_INTEREST', 'RESUME_INTEREST', 'APPLY_WAIVER', 'APPLY_FEE', 'RESCHEDULE_PLAN', 'LEDGER_REVERSAL', 'NOTE');

-- CreateEnum
CREATE TYPE "SupportActionStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SupportRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "RepaymentScheduleVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "jsonPlan" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepaymentScheduleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT,
    "borrowerId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "SupportActionType" NOT NULL,
    "risk" "SupportRiskLevel" NOT NULL,
    "status" "SupportActionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "payloadJson" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "executedById" TEXT,
    "rejectedById" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "SupportAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepaymentScheduleVersion_tenantId_loanApplicationId_effecti_idx" ON "RepaymentScheduleVersion"("tenantId", "loanApplicationId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "RepaymentScheduleVersion_tenantId_loanApplicationId_version_key" ON "RepaymentScheduleVersion"("tenantId", "loanApplicationId", "version");

-- CreateIndex
CREATE INDEX "SupportCase_tenantId_status_createdAt_idx" ON "SupportCase"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportCase_tenantId_loanId_status_idx" ON "SupportCase"("tenantId", "loanId", "status");

-- CreateIndex
CREATE INDEX "SupportCase_tenantId_borrowerId_status_idx" ON "SupportCase"("tenantId", "borrowerId", "status");

-- CreateIndex
CREATE INDEX "SupportNote_tenantId_caseId_createdAt_idx" ON "SupportNote"("tenantId", "caseId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportAction_tenantId_caseId_createdAt_idx" ON "SupportAction"("tenantId", "caseId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportAction_tenantId_status_risk_createdAt_idx" ON "SupportAction"("tenantId", "status", "risk", "createdAt");

-- AddForeignKey
ALTER TABLE "RepaymentScheduleVersion" ADD CONSTRAINT "RepaymentScheduleVersion_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportNote" ADD CONSTRAINT "SupportNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAction" ADD CONSTRAINT "SupportAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
