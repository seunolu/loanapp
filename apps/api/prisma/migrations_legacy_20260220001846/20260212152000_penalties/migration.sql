-- CreateTable
CREATE TABLE "PenaltyAccrual" (
  "id" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "accrualDate" TIMESTAMP(3) NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "journalEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PenaltyAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PenaltyAccrual_journalEntryId_key" ON "PenaltyAccrual"("journalEntryId");
CREATE UNIQUE INDEX "PenaltyAccrual_loanId_accrualDate_key" ON "PenaltyAccrual"("loanId", "accrualDate");
CREATE INDEX "PenaltyAccrual_loanId_createdAt_idx" ON "PenaltyAccrual"("loanId", "createdAt");

-- AddForeignKey
ALTER TABLE "PenaltyAccrual"
ADD CONSTRAINT "PenaltyAccrual_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PenaltyAccrual"
ADD CONSTRAINT "PenaltyAccrual_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
