-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('WEBHOOK', 'VERIFY', 'MANUAL', 'SYSTEM');

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED',
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER,
    "netMinor" INTEGER,
    "borrowerId" TEXT,
    "loanId" TEXT,
    "repaymentScheduleId" TEXT,
    "disbursementId" TEXT,
    "providerReference" TEXT,
    "providerIntentId" TEXT,
    "providerCustomerId" TEXT,
    "providerRawInit" JSONB,
    "providerRawVerify" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "createdByAdminId" TEXT,
    "createdByBorrowerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "type" "PaymentEventType" NOT NULL,
    "providerEventId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "raw" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntentHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "fromStatus" "PaymentIntentStatus",
    "toStatus" "PaymentIntentStatus" NOT NULL,
    "reason" TEXT,
    "actorType" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIntentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentIntent_tenantId_status_direction_idx" ON "PaymentIntent"("tenantId", "status", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_tenantId_idempotencyKey_key" ON "PaymentIntent"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_provider_providerReference_key" ON "PaymentIntent"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "PaymentEvent_tenantId_intentId_idx" ON "PaymentEvent"("tenantId", "intentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "PaymentIntentHistory_tenantId_intentId_createdAt_idx" ON "PaymentIntentHistory"("tenantId", "intentId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntentHistory" ADD CONSTRAINT "PaymentIntentHistory_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
