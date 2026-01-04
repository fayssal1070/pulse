-- CreateTable IF NOT EXISTS for AiProviderConnection (PR15 - AI Providers Router)
-- Safe migration: uses IF NOT EXISTS to avoid errors if table already exists

-- CreateEnum IF NOT EXISTS for AiProvider
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiProvider') THEN
        CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'XAI', 'GOOGLE', 'MISTRAL');
    END IF;
END $$;

-- CreateEnum IF NOT EXISTS for AiProviderConnectionStatus
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiProviderConnectionStatus') THEN
        CREATE TYPE "AiProviderConnectionStatus" AS ENUM ('ACTIVE', 'DISABLED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "AiProviderConnection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AiProviderConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "encryptedApiKey" TEXT NOT NULL,
    "keyLast4" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable IF NOT EXISTS for AiModelRoute (PR15 - AI Providers Router)
CREATE TABLE IF NOT EXISTS "AiModelRoute" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "maxCostPerReqEUR" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModelRoute_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints IF NOT EXISTS (safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AiProviderConnection_orgId_provider_name_key'
    ) THEN
        ALTER TABLE "AiProviderConnection" ADD CONSTRAINT "AiProviderConnection_orgId_provider_name_key" 
        UNIQUE ("orgId", "provider", "name");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AiModelRoute_orgId_provider_model_key'
    ) THEN
        ALTER TABLE "AiModelRoute" ADD CONSTRAINT "AiModelRoute_orgId_provider_model_key" 
        UNIQUE ("orgId", "provider", "model");
    END IF;
END $$;

-- Create indexes IF NOT EXISTS (safe)
CREATE INDEX IF NOT EXISTS "AiProviderConnection_orgId_idx" ON "AiProviderConnection"("orgId");
CREATE INDEX IF NOT EXISTS "AiProviderConnection_orgId_provider_idx" ON "AiProviderConnection"("orgId", "provider");
CREATE INDEX IF NOT EXISTS "AiProviderConnection_orgId_status_idx" ON "AiProviderConnection"("orgId", "status");

CREATE INDEX IF NOT EXISTS "AiModelRoute_orgId_idx" ON "AiModelRoute"("orgId");
CREATE INDEX IF NOT EXISTS "AiModelRoute_orgId_provider_idx" ON "AiModelRoute"("orgId", "provider");
CREATE INDEX IF NOT EXISTS "AiModelRoute_orgId_enabled_idx" ON "AiModelRoute"("orgId", "enabled");

-- Add foreign key constraints IF NOT EXISTS (safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AiProviderConnection_orgId_fkey'
    ) THEN
        ALTER TABLE "AiProviderConnection" ADD CONSTRAINT "AiProviderConnection_orgId_fkey" 
        FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AiModelRoute_orgId_fkey'
    ) THEN
        ALTER TABLE "AiModelRoute" ADD CONSTRAINT "AiModelRoute_orgId_fkey" 
        FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
