-- AlterEnum
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'DAILY_AGGREGATE_BUILD';

-- CreateTable
CREATE TABLE "DailyAggregate" (
  "id" TEXT NOT NULL,
  "lenderId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "activeLoansCount" INTEGER NOT NULL,
  "overdueLoansCount" INTEGER NOT NULL,
  "principalOutstandingKobo" INTEGER NOT NULL,
  "totalOutstandingKobo" INTEGER NOT NULL,
  "disbursedKobo" INTEGER NOT NULL,
  "collectionsKobo" INTEGER NOT NULL,
  "par1Kobo" INTEGER NOT NULL,
  "par7Kobo" INTEGER NOT NULL,
  "par30Kobo" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyAggregate_lenderId_date_key" ON "DailyAggregate"("lenderId", "date");

-- CreateIndex
CREATE INDEX "DailyAggregate_date_idx" ON "DailyAggregate"("date");

-- AddForeignKey
ALTER TABLE "DailyAggregate"
ADD CONSTRAINT "DailyAggregate_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
