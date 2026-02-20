-- CreateEnum
CREATE TYPE "PayoutIntentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "BorrowerPayoutProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "recipientCode" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BorrowerPayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutIntent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PayoutIntentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL,
    "paymentIntentId" TEXT,
    "providerTransferCode" TEXT,
    "providerReference" TEXT,
    "recipientCode" TEXT NOT NULL,
    "metadata" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "lastError" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recipientProfileId" TEXT,
    CONSTRAINT "PayoutIntent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PaymentEvent"
ADD COLUMN "payoutId" TEXT,
ADD COLUMN "normalizedType" TEXT,
ADD COLUMN "processedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "BorrowerPayoutProfile_tenantId_borrowerId_provider_key" ON "BorrowerPayoutProfile"("tenantId", "borrowerId", "provider");
CREATE INDEX "BorrowerPayoutProfile_tenantId_createdAt_idx" ON "BorrowerPayoutProfile"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutIntent_tenantId_status_createdAt_idx" ON "PayoutIntent"("tenantId", "status", "createdAt");
CREATE INDEX "PayoutIntent_tenantId_loanId_createdAt_idx" ON "PayoutIntent"("tenantId", "loanId", "createdAt");
CREATE UNIQUE INDEX "PayoutIntent_tenantId_idempotencyKey_key" ON "PayoutIntent"("tenantId", "idempotencyKey");
CREATE UNIQUE INDEX "PayoutIntent_provider_providerTransferCode_key" ON "PayoutIntent"("provider", "providerTransferCode");
CREATE UNIQUE INDEX "PayoutIntent_provider_providerReference_key" ON "PayoutIntent"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "PaymentEvent_tenantId_payoutId_idx" ON "PaymentEvent"("tenantId", "payoutId");

-- AddForeignKey
ALTER TABLE "PayoutIntent" ADD CONSTRAINT "PayoutIntent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayoutIntent" ADD CONSTRAINT "PayoutIntent_recipientProfileId_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "BorrowerPayoutProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "PayoutIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
