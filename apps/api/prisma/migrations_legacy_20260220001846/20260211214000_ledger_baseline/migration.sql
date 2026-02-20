-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalLineType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "LedgerAccount" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "LedgerAccountType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
  "id" TEXT NOT NULL,
  "description" TEXT,
  "reference" TEXT,
  "requestId" TEXT,
  "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
  "id" TEXT NOT NULL,
  "journalEntryId" TEXT NOT NULL,
  "ledgerAccountId" TEXT NOT NULL,
  "entryType" "JournalLineType" NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");
CREATE INDEX "LedgerAccount_type_isActive_idx" ON "LedgerAccount"("type", "isActive");
CREATE INDEX "JournalEntry_postedAt_idx" ON "JournalEntry"("postedAt");
CREATE INDEX "JournalEntry_reference_idx" ON "JournalEntry"("reference");
CREATE INDEX "JournalEntry_requestId_idx" ON "JournalEntry"("requestId");
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");
CREATE INDEX "JournalLine_ledgerAccountId_idx" ON "JournalLine"("ledgerAccountId");
CREATE INDEX "JournalLine_entryType_idx" ON "JournalLine"("entryType");

-- AddForeignKey
ALTER TABLE "JournalLine"
ADD CONSTRAINT "JournalLine_journalEntryId_fkey"
FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalLine"
ADD CONSTRAINT "JournalLine_ledgerAccountId_fkey"
FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
