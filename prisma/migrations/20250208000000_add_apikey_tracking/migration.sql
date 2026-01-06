-- PR24 Migration: Add apiKeyId tracking to AiRequestLog and CostEvent
-- Safe migration with IF NOT EXISTS

-- Add apiKeyId to AiRequestLog
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiRequestLog' AND column_name = 'apiKeyId'
  ) THEN
    ALTER TABLE "AiRequestLog" ADD COLUMN "apiKeyId" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiRequestLog' AND column_name = 'apiKeyLabelSnapshot'
  ) THEN
    ALTER TABLE "AiRequestLog" ADD COLUMN "apiKeyLabelSnapshot" TEXT;
  END IF;
END $$;

-- Add indexes for apiKeyId on AiRequestLog
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'AiRequestLog_apiKeyId_idx'
  ) THEN
    CREATE INDEX "AiRequestLog_apiKeyId_idx" ON "AiRequestLog"("apiKeyId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'AiRequestLog_orgId_apiKeyId_idx'
  ) THEN
    CREATE INDEX "AiRequestLog_orgId_apiKeyId_idx" ON "AiRequestLog"("orgId", "apiKeyId");
  END IF;
END $$;

-- Add apiKeyId to CostEvent
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'CostEvent' AND column_name = 'apiKeyId'
  ) THEN
    ALTER TABLE "CostEvent" ADD COLUMN "apiKeyId" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'CostEvent' AND column_name = 'apiKeyLabelSnapshot'
  ) THEN
    ALTER TABLE "CostEvent" ADD COLUMN "apiKeyLabelSnapshot" TEXT;
  END IF;
END $$;

-- Add indexes for apiKeyId on CostEvent
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'CostEvent_apiKeyId_idx'
  ) THEN
    CREATE INDEX "CostEvent_apiKeyId_idx" ON "CostEvent"("apiKeyId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'CostEvent_orgId_apiKeyId_idx'
  ) THEN
    CREATE INDEX "CostEvent_orgId_apiKeyId_idx" ON "CostEvent"("orgId", "apiKeyId");
  END IF;
END $$;

