-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('COMPLAINT', 'DISPUTE', 'REQUEST');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'AWAITING_BORROWER', 'ESCALATED', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CaseResolutionCode" AS ENUM (
  'REFUND_ISSUED',
  'WAIVER_GRANTED',
  'PAYMENT_REVERSED',
  'CORRECTION_MADE',
  'NO_ACTION_REQUIRED',
  'FRAUD_CONFIRMED',
  'FRAUD_NOT_CONFIRMED',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "CaseMessageVisibility" AS ENUM ('INTERNAL', 'BORROWER');

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT,
    "loanApplicationId" TEXT,
    "repaymentId" TEXT,
    "disbursementId" TEXT,
    "type" "CaseType" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CasePriority" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedToAdminUserId" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "lastOverdueNotifiedAt" TIMESTAMP(3),
    "resolutionCode" "CaseResolutionCode",
    "resolutionNotes" TEXT,
    "createdByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "visibility" "CaseMessageVisibility" NOT NULL,
    "message" TEXT NOT NULL,
    "createdByAdminUserId" TEXT,
    "createdByBorrowerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "changedByAdminUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Case_tenantId_idx" ON "Case"("tenantId");
CREATE INDEX "Case_tenantId_status_idx" ON "Case"("tenantId", "status");
CREATE INDEX "Case_tenantId_priority_idx" ON "Case"("tenantId", "priority");
CREATE INDEX "Case_tenantId_assignedToAdminUserId_idx" ON "Case"("tenantId", "assignedToAdminUserId");
CREATE INDEX "Case_tenantId_borrowerId_idx" ON "Case"("tenantId", "borrowerId");
CREATE INDEX "Case_tenantId_loanApplicationId_idx" ON "Case"("tenantId", "loanApplicationId");
CREATE INDEX "Case_tenantId_slaDueAt_idx" ON "Case"("tenantId", "slaDueAt");

CREATE INDEX "CaseMessage_tenantId_caseId_idx" ON "CaseMessage"("tenantId", "caseId");
CREATE INDEX "CaseStatusHistory_tenantId_caseId_createdAt_idx" ON "CaseStatusHistory"("tenantId", "caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TenantLoanApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Case" ADD CONSTRAINT "Case_repaymentId_fkey" FOREIGN KEY ("repaymentId") REFERENCES "LoanRepayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
