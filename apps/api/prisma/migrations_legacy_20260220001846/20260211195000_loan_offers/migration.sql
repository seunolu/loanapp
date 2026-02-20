-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'FINANCE';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'VIEWER';

-- AlterTable
ALTER TABLE "LoanApplication"
ADD COLUMN "reviewReason" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "LoanOfferStatus" AS ENUM ('OFFERED');

-- CreateTable
CREATE TABLE "LoanOffer" (
  "id" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "status" "LoanOfferStatus" NOT NULL DEFAULT 'OFFERED',
  "principalAmount" INTEGER NOT NULL,
  "interestAmount" INTEGER NOT NULL,
  "feeAmount" INTEGER NOT NULL,
  "totalRepayable" INTEGER NOT NULL,
  "offeredByAdminId" TEXT NOT NULL,
  "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoanOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanOfferScheduleItem" (
  "id" TEXT NOT NULL,
  "loanOfferId" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoanOfferScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanOffer_loanApplicationId_key" ON "LoanOffer"("loanApplicationId");
CREATE INDEX "LoanOffer_borrowerId_idx" ON "LoanOffer"("borrowerId");
CREATE INDEX "LoanOffer_status_idx" ON "LoanOffer"("status");
CREATE INDEX "LoanOfferScheduleItem_loanOfferId_dueDate_idx" ON "LoanOfferScheduleItem"("loanOfferId", "dueDate");

-- AddForeignKey
ALTER TABLE "LoanOffer"
ADD CONSTRAINT "LoanOffer_loanApplicationId_fkey"
FOREIGN KEY ("loanApplicationId") REFERENCES "LoanApplication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoanOffer"
ADD CONSTRAINT "LoanOffer_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoanOfferScheduleItem"
ADD CONSTRAINT "LoanOfferScheduleItem_loanOfferId_fkey"
FOREIGN KEY ("loanOfferId") REFERENCES "LoanOffer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
