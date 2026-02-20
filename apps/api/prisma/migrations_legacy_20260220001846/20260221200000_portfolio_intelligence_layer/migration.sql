-- CreateTable
CREATE TABLE "PortfolioDailySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "activeLoanCount" INTEGER NOT NULL DEFAULT 0,
    "outstandingTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "par30Outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "par90Outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disbursedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "repaidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioDailySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioDailySnapshot_tenantId_date_idx" ON "PortfolioDailySnapshot"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioDailySnapshot_tenantId_date_key" ON "PortfolioDailySnapshot"("tenantId", "date");

