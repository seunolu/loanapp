-- AlterEnum
ALTER TYPE "DisbursementStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "DisbursementStatus" ADD VALUE IF NOT EXISTS 'SUCCEEDED';
ALTER TYPE "DisbursementStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- AlterTable
ALTER TABLE "Disbursement"
ADD COLUMN "journalEntryId" TEXT,
ADD COLUMN "succeededAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_journalEntryId_key" ON "Disbursement"("journalEntryId");

-- AddForeignKey
ALTER TABLE "Disbursement"
ADD CONSTRAINT "Disbursement_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
