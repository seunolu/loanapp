-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateTable
CREATE TABLE "File" (
  "id" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "purpose" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "File_storageKey_key" ON "File"("storageKey");

-- CreateIndex
CREATE INDEX "File_borrowerId_status_idx" ON "File"("borrowerId", "status");

-- AddForeignKey
ALTER TABLE "File"
ADD CONSTRAINT "File_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
