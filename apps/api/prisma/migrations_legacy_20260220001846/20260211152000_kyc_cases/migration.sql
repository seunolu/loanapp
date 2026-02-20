-- CreateEnum
CREATE TYPE "KycCaseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "KycCase" (
  "id" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "status" "KycCaseStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KycCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
  "id" TEXT NOT NULL,
  "kycCaseId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycCase_borrowerId_key" ON "KycCase"("borrowerId");

-- CreateIndex
CREATE UNIQUE INDEX "KycDocument_kycCaseId_fileId_key" ON "KycDocument"("kycCaseId", "fileId");

-- CreateIndex
CREATE INDEX "KycDocument_fileId_idx" ON "KycDocument"("fileId");

-- AddForeignKey
ALTER TABLE "KycCase"
ADD CONSTRAINT "KycCase_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument"
ADD CONSTRAINT "KycDocument_kycCaseId_fkey"
FOREIGN KEY ("kycCaseId") REFERENCES "KycCase"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument"
ADD CONSTRAINT "KycDocument_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "File"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
