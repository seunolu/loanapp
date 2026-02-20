-- AlterEnum
ALTER TYPE "RepaymentScheduleItemStatus" RENAME VALUE 'MISSED' TO 'LATE';

-- AlterTable
ALTER TABLE "RepaymentScheduleItem"
ADD COLUMN "paidAmountKobo" INTEGER NOT NULL DEFAULT 0;
