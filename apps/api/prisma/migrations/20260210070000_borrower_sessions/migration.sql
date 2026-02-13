-- AlterTable
ALTER TABLE "OtpChallenge"
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "consumedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Borrower" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Borrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowerDevice" (
  "id" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "platform" TEXT,
  "deviceName" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BorrowerDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "borrowerId" TEXT NOT NULL,
  "borrowerDeviceId" TEXT,
  "refreshTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_phone_key" ON "Borrower"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerDevice_borrowerId_deviceId_key" ON "BorrowerDevice"("borrowerId", "deviceId");

-- CreateIndex
CREATE INDEX "BorrowerDevice_borrowerId_idx" ON "BorrowerDevice"("borrowerId");

-- CreateIndex
CREATE INDEX "Session_borrowerId_idx" ON "Session"("borrowerId");
CREATE INDEX "Session_borrowerDeviceId_idx" ON "Session"("borrowerDeviceId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "Session_revokedAt_idx" ON "Session"("revokedAt");

-- AddForeignKey
ALTER TABLE "BorrowerDevice"
ADD CONSTRAINT "BorrowerDevice_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session"
ADD CONSTRAINT "Session_borrowerId_fkey"
FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session"
ADD CONSTRAINT "Session_borrowerDeviceId_fkey"
FOREIGN KEY ("borrowerDeviceId") REFERENCES "BorrowerDevice"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
