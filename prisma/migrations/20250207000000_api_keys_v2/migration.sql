-- PR23 Migration: API Keys V2 - Extend AiGatewayKey with new fields + ApiKeyAudit
-- Safe migration with IF NOT EXISTS and DO blocks

-- Add label to AiGatewayKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'label'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "label" TEXT;
  END IF;
END $$;

-- Add defaultTeamId to AiGatewayKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'defaultTeamId'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "defaultTeamId" TEXT;
  END IF;
END $$;

-- Add restrictions fields (JSON)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'allowedModels'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "allowedModels" JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'blockedModels'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "blockedModels" JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'requireAttribution'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "requireAttribution" BOOLEAN;
  END IF;
END $$;

-- Add cost limits
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'dailyCostLimitEur'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "dailyCostLimitEur" DECIMAL(12, 4);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'monthlyCostLimitEur'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "monthlyCostLimitEur" DECIMAL(12, 4);
  END IF;
END $$;

-- Add observability fields
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'lastUsedAt'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "expiresAt" TIMESTAMP(3);
  END IF;
END $$;

-- Add updatedAt if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AiGatewayKey' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Add foreign key for defaultTeamId
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'AiGatewayKey_defaultTeamId_fkey'
  ) THEN
    ALTER TABLE "AiGatewayKey" ADD CONSTRAINT "AiGatewayKey_defaultTeamId_fkey" 
      FOREIGN KEY ("defaultTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Create indexes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'AiGatewayKey_keyPrefix_idx'
  ) THEN
    CREATE INDEX "AiGatewayKey_keyPrefix_idx" ON "AiGatewayKey"("keyPrefix");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'AiGatewayKey_lastUsedAt_idx'
  ) THEN
    CREATE INDEX "AiGatewayKey_lastUsedAt_idx" ON "AiGatewayKey"("lastUsedAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'AiGatewayKey_status_lastUsedAt_idx'
  ) THEN
    CREATE INDEX "AiGatewayKey_status_lastUsedAt_idx" ON "AiGatewayKey"("status", "lastUsedAt");
  END IF;
END $$;

-- Create ApiKeyAudit table
CREATE TABLE IF NOT EXISTS "ApiKeyAudit" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyAudit_pkey" PRIMARY KEY ("id")
);

-- Create indexes for ApiKeyAudit
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'ApiKeyAudit_orgId_idx'
  ) THEN
    CREATE INDEX "ApiKeyAudit_orgId_idx" ON "ApiKeyAudit"("orgId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'ApiKeyAudit_apiKeyId_idx'
  ) THEN
    CREATE INDEX "ApiKeyAudit_apiKeyId_idx" ON "ApiKeyAudit"("apiKeyId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'ApiKeyAudit_createdAt_idx'
  ) THEN
    CREATE INDEX "ApiKeyAudit_createdAt_idx" ON "ApiKeyAudit"("createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'ApiKeyAudit_action_idx'
  ) THEN
    CREATE INDEX "ApiKeyAudit_action_idx" ON "ApiKeyAudit"("action");
  END IF;
END $$;

-- Add foreign key constraints for ApiKeyAudit
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ApiKeyAudit_apiKeyId_fkey'
  ) THEN
    ALTER TABLE "ApiKeyAudit" ADD CONSTRAINT "ApiKeyAudit_apiKeyId_fkey" 
      FOREIGN KEY ("apiKeyId") REFERENCES "AiGatewayKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ApiKeyAudit_orgId_fkey'
  ) THEN
    ALTER TABLE "ApiKeyAudit" ADD CONSTRAINT "ApiKeyAudit_orgId_fkey" 
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Verify migration
SELECT 'Migration completed! ApiKeyAudit table exists: ' || 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ApiKeyAudit') 
            THEN 'YES' 
            ELSE 'NO' 
       END as result;

