-- CreateEnum
CREATE TYPE "LoanApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "LoanApplication" (
  "id" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "amountRequested" INTEGER NOT NULL,
  "tenorDays" INTEGER NOT NULL,
  "status" "LoanApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoanApplication_borrowerId_status_idx" ON "LoanApplication"("borrowerId", "status");
CREATE INDEX "LoanApplication_createdAt_idx" ON "LoanApplication"("createdAt");

-- AddForeignKey
ALTER TABLE "LoanApplication"
ADD CONSTRAINT "LoanApplication_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
