BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UnderwritingCaseStatus') THEN
    CREATE TYPE "UnderwritingCaseStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UnderwritingChecklistStatus') THEN
    CREATE TYPE "UnderwritingChecklistStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');
  END IF;
END $$;

CREATE TABLE "UnderwritingCase" (
  "id" TEXT NOT NULL,
  "lenderId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "status" "UnderwritingCaseStatus" NOT NULL DEFAULT 'PENDING',
  "monthlyIncomeKobo" INTEGER,
  "existingDebtKobo" INTEGER,
  "riskLevel" TEXT,
  "decisionNotes" TEXT,
  "decidedByAdminId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnderwritingCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnderwritingChecklistItem" (
  "id" TEXT NOT NULL,
  "underwritingCaseId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "UnderwritingChecklistStatus" NOT NULL DEFAULT 'PENDING',
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnderwritingChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnderwritingCase_loanApplicationId_key" ON "UnderwritingCase"("loanApplicationId");
CREATE INDEX "UnderwritingCase_lenderId_status_createdAt_idx" ON "UnderwritingCase"("lenderId", "status", "createdAt");
CREATE INDEX "UnderwritingCase_borrowerId_idx" ON "UnderwritingCase"("borrowerId");
CREATE UNIQUE INDEX "UnderwritingChecklistItem_underwritingCaseId_code_key" ON "UnderwritingChecklistItem"("underwritingCaseId", "code");
CREATE INDEX "UnderwritingChecklistItem_underwritingCaseId_status_idx" ON "UnderwritingChecklistItem"("underwritingCaseId", "status");

ALTER TABLE "UnderwritingCase"
  ADD CONSTRAINT "UnderwritingCase_lenderId_fkey"
  FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnderwritingCase"
  ADD CONSTRAINT "UnderwritingCase_borrowerId_fkey"
  FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UnderwritingCase"
  ADD CONSTRAINT "UnderwritingCase_loanApplicationId_fkey"
  FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UnderwritingCase"
  ADD CONSTRAINT "UnderwritingCase_decidedByAdminId_fkey"
  FOREIGN KEY ("decidedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnderwritingChecklistItem"
  ADD CONSTRAINT "UnderwritingChecklistItem_underwritingCaseId_fkey"
  FOREIGN KEY ("underwritingCaseId") REFERENCES "UnderwritingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

