-- Create AlertRule table if it doesn't exist (for databases that haven't applied previous migrations)
CREATE TABLE IF NOT EXISTS "AlertRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "thresholdEUR" DOUBLE PRECISION NOT NULL,
    "windowDays" INTEGER NOT NULL DEFAULT 7,
    "triggered" BOOLEAN NOT NULL DEFAULT false,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "AlertRule_orgId_idx" ON "AlertRule"("orgId");

-- Add foreign key if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AlertRule_orgId_fkey'
    ) THEN
        ALTER TABLE "AlertRule" 
        ADD CONSTRAINT "AlertRule_orgId_fkey" 
        FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: Add new columns to AlertRule with defaults for existing data
-- Only add columns that don't exist
DO $$ 
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'name') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "name" TEXT;
    END IF;
    
    -- Add type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'type') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "type" TEXT;
    END IF;
    
    -- Add enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'enabled') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    -- Add spikePercent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'spikePercent') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "spikePercent" DOUBLE PRECISION;
    END IF;
    
    -- Add lookbackDays column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'lookbackDays') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "lookbackDays" INTEGER NOT NULL DEFAULT 7;
    END IF;
    
    -- Add notifyEmail column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'notifyEmail') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "notifyEmail" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add cooldownHours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'cooldownHours') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "cooldownHours" INTEGER NOT NULL DEFAULT 24;
    END IF;
    
    -- Add lastTriggeredAt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'lastTriggeredAt') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "lastTriggeredAt" TIMESTAMP(3);
    END IF;
    
    -- Add updatedAt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'updatedAt') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing rows with default values
UPDATE "AlertRule" 
SET 
  "name" = 'Legacy Alert',
  "type" = 'DAILY_SPIKE',
  "updatedAt" = "createdAt"
WHERE "name" IS NULL;

-- Make name and type required (only if columns exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'name' AND is_nullable = 'YES') THEN
        ALTER TABLE "AlertRule" ALTER COLUMN "name" SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'type' AND is_nullable = 'YES') THEN
        ALTER TABLE "AlertRule" ALTER COLUMN "type" SET NOT NULL;
    END IF;
END $$;

-- Drop old columns if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'triggered') THEN
        ALTER TABLE "AlertRule" DROP COLUMN "triggered";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'windowDays') THEN
        ALTER TABLE "AlertRule" DROP COLUMN "windowDays";
    END IF;
END $$;

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



