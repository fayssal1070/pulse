-- Safe migration: Add missing fields to AlertRule and AlertEvent (PR9)
-- Uses IF NOT EXISTS / checks to avoid errors if columns already exist

-- Add providerFilter to AlertRule (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AlertRule' AND column_name = 'providerFilter'
  ) THEN
    ALTER TABLE "AlertRule" ADD COLUMN "providerFilter" TEXT;
  END IF;
END $$;

-- Add topSharePercent to AlertRule (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AlertRule' AND column_name = 'topSharePercent'
  ) THEN
    ALTER TABLE "AlertRule" ADD COLUMN "topSharePercent" DOUBLE PRECISION;
  END IF;
END $$;

-- Add createdByUserId to AlertRule (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AlertRule' AND column_name = 'createdByUserId'
  ) THEN
    ALTER TABLE "AlertRule" ADD COLUMN "createdByUserId" TEXT;
  END IF;
END $$;

-- Add severity to AlertEvent (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AlertEvent' AND column_name = 'severity'
  ) THEN
    ALTER TABLE "AlertEvent" ADD COLUMN "severity" TEXT DEFAULT 'INFO';
  END IF;
END $$;

-- Update existing AlertRule.type to support new types (safe - no data loss)
-- Note: This doesn't change existing data, just allows new enum values

-- Update existing AlertEvent.severity to WARN if null (for existing events)
UPDATE "AlertEvent" SET "severity" = 'WARN' WHERE "severity" IS NULL;

