-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "provider" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL,
  "error" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_event_createdAt_idx" ON "NotificationLog"("event", "createdAt");
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");
CREATE INDEX "NotificationLog_recipient_createdAt_idx" ON "NotificationLog"("recipient", "createdAt");
