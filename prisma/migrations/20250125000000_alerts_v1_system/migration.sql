-- AlterTable: Add new columns to AlertRule with defaults for existing data
ALTER TABLE "AlertRule" 
  ADD COLUMN "name" TEXT,
  ADD COLUMN "type" TEXT,
  ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "spikePercent" DOUBLE PRECISION,
  ADD COLUMN "lookbackDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cooldownHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "lastTriggeredAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows with default values
UPDATE "AlertRule" 
SET 
  "name" = 'Legacy Alert',
  "type" = 'DAILY_SPIKE',
  "updatedAt" = "createdAt"
WHERE "name" IS NULL;

-- Make name and type required
ALTER TABLE "AlertRule" 
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "type" SET NOT NULL;

-- Drop old columns
ALTER TABLE "AlertRule" 
  DROP COLUMN "triggered",
  DROP COLUMN "windowDays";

-- CreateTable: AlertEvent
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountEUR" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InAppNotification
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertRule_orgId_enabled_idx" ON "AlertRule"("orgId", "enabled");

-- CreateIndex
CREATE INDEX "AlertEvent_orgId_idx" ON "AlertEvent"("orgId");

-- CreateIndex
CREATE INDEX "AlertEvent_alertId_idx" ON "AlertEvent"("alertId");

-- CreateIndex
CREATE INDEX "AlertEvent_orgId_triggeredAt_idx" ON "AlertEvent"("orgId", "triggeredAt");

-- CreateIndex
CREATE INDEX "InAppNotification_orgId_idx" ON "InAppNotification"("orgId");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_idx" ON "InAppNotification"("userId");

-- CreateIndex
CREATE INDEX "InAppNotification_orgId_readAt_idx" ON "InAppNotification"("orgId", "readAt");

-- CreateIndex
CREATE INDEX "InAppNotification_orgId_createdAt_idx" ON "InAppNotification"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

