-- Script pour appliquer toutes les migrations manquantes
-- À exécuter dans Supabase SQL Editor

-- Migration 1: 20250127000000_add_ai_log_retention_days
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Organization' AND column_name = 'aiLogRetentionDays') THEN
        ALTER TABLE "Organization" ADD COLUMN "aiLogRetentionDays" INTEGER NOT NULL DEFAULT 90;
    END IF;
END $$;

-- Migration 2: 20250128000000_add_alert_rules_v2_fields
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'spikePercent') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "spikePercent" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'topSharePercent') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "topSharePercent" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'lookbackDays') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "lookbackDays" INTEGER NOT NULL DEFAULT 7;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRule' AND column_name = 'providerFilter') THEN
        ALTER TABLE "AlertRule" ADD COLUMN "providerFilter" TEXT;
    END IF;
END $$;

-- Migration 3: 20250129000000_add_directory_dimensions
-- Créer les tables Team, Project, App, Client si elles n'existent pas
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "App" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- Ajouter les foreign keys si elles n'existent pas
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Team_orgId_fkey') THEN
        ALTER TABLE "Team" ADD CONSTRAINT "Team_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_orgId_fkey') THEN
        ALTER TABLE "Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'App_orgId_fkey') THEN
        ALTER TABLE "App" ADD CONSTRAINT "App_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_orgId_fkey') THEN
        ALTER TABLE "Client" ADD CONSTRAINT "Client_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Migration 4: 20250130000000_add_cron_run
CREATE TABLE IF NOT EXISTS "CronRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CronRun_orgId_fkey') THEN
        ALTER TABLE "CronRun" ADD CONSTRAINT "CronRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Migration 5: 20250131000000_add_ai_providers_router
-- Créer les enums si nécessaire
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aiprovider') THEN
        CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'XAI', 'GOOGLE', 'MISTRAL');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aiproviderconnectionstatus') THEN
        CREATE TYPE "AiProviderConnectionStatus" AS ENUM ('ACTIVE', 'DISABLED');
    END IF;
END $$;

-- Créer AiProviderConnection
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

-- Créer AiModelRoute
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

-- Ajouter les contraintes uniques
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiProviderConnection_orgId_provider_name_key') THEN
        ALTER TABLE "AiProviderConnection" ADD CONSTRAINT "AiProviderConnection_orgId_provider_name_key" UNIQUE ("orgId", "provider", "name");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiModelRoute_orgId_provider_model_key') THEN
        ALTER TABLE "AiModelRoute" ADD CONSTRAINT "AiModelRoute_orgId_provider_model_key" UNIQUE ("orgId", "provider", "model");
    END IF;
END $$;

-- Ajouter les foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiProviderConnection_orgId_fkey') THEN
        ALTER TABLE "AiProviderConnection" ADD CONSTRAINT "AiProviderConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiModelRoute_orgId_fkey') THEN
        ALTER TABLE "AiModelRoute" ADD CONSTRAINT "AiModelRoute_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Migration 6: 20250201000000_add_ai_gateway_key_defaults_ratelimit
-- Add defaultAppId, defaultProjectId, defaultClientId, rateLimitRpm, enabled to AiGatewayKey
DO $$ BEGIN
    -- Add enabled column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AiGatewayKey' AND column_name = 'enabled') THEN
        ALTER TABLE "AiGatewayKey" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Add defaultAppId column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AiGatewayKey' AND column_name = 'defaultAppId') THEN
        ALTER TABLE "AiGatewayKey" ADD COLUMN "defaultAppId" TEXT;
    END IF;

    -- Add defaultProjectId column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AiGatewayKey' AND column_name = 'defaultProjectId') THEN
        ALTER TABLE "AiGatewayKey" ADD COLUMN "defaultProjectId" TEXT;
    END IF;

    -- Add defaultClientId column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AiGatewayKey' AND column_name = 'defaultClientId') THEN
        ALTER TABLE "AiGatewayKey" ADD COLUMN "defaultClientId" TEXT;
    END IF;

    -- Add rateLimitRpm column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AiGatewayKey' AND column_name = 'rateLimitRpm') THEN
        ALTER TABLE "AiGatewayKey" ADD COLUMN "rateLimitRpm" INTEGER;
    END IF;
END $$;

-- CreateIndex IF NOT EXISTS "AiGatewayKey_enabled_idx"
CREATE INDEX IF NOT EXISTS "AiGatewayKey_enabled_idx" ON "AiGatewayKey"("enabled");

-- AddForeignKey IF NOT EXISTS "AiGatewayKey_defaultAppId_fkey"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiGatewayKey_defaultAppId_fkey') THEN
        ALTER TABLE "AiGatewayKey" ADD CONSTRAINT "AiGatewayKey_defaultAppId_fkey" 
            FOREIGN KEY ("defaultAppId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey IF NOT EXISTS "AiGatewayKey_defaultProjectId_fkey"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiGatewayKey_defaultProjectId_fkey') THEN
        ALTER TABLE "AiGatewayKey" ADD CONSTRAINT "AiGatewayKey_defaultProjectId_fkey" 
            FOREIGN KEY ("defaultProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey IF NOT EXISTS "AiGatewayKey_defaultClientId_fkey"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiGatewayKey_defaultClientId_fkey') THEN
        ALTER TABLE "AiGatewayKey" ADD CONSTRAINT "AiGatewayKey_defaultClientId_fkey" 
            FOREIGN KEY ("defaultClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable IF NOT EXISTS "ApiKeyUsageWindow"
CREATE TABLE IF NOT EXISTS "ApiKeyUsageWindow" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKeyUsageWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex IF NOT EXISTS "ApiKeyUsageWindow_keyId_windowStart_key"
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKeyUsageWindow_keyId_windowStart_key" ON "ApiKeyUsageWindow"("keyId", "windowStart");

-- CreateIndex IF NOT EXISTS "ApiKeyUsageWindow_keyId_idx"
CREATE INDEX IF NOT EXISTS "ApiKeyUsageWindow_keyId_idx" ON "ApiKeyUsageWindow"("keyId");

-- CreateIndex IF NOT EXISTS "ApiKeyUsageWindow_windowStart_idx"
CREATE INDEX IF NOT EXISTS "ApiKeyUsageWindow_windowStart_idx" ON "ApiKeyUsageWindow"("windowStart");

-- AddForeignKey IF NOT EXISTS "ApiKeyUsageWindow_keyId_fkey"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiKeyUsageWindow_keyId_fkey') THEN
        ALTER TABLE "ApiKeyUsageWindow" ADD CONSTRAINT "ApiKeyUsageWindow_keyId_fkey" 
            FOREIGN KEY ("keyId") REFERENCES "AiGatewayKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Enregistrer les migrations dans _prisma_migrations (optionnel, pour tracking)
-- Note: Prisma gère normalement cette table automatiquement, mais on peut l'ajouter manuellement si nécessaire
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT 
    gen_random_uuid()::text,
    '',
    NOW(),
    '20250127000000_add_ai_log_retention_days',
    NULL,
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20250127000000_add_ai_log_retention_days');

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT 
    gen_random_uuid()::text,
    '',
    NOW(),
    '20250128000000_add_alert_rules_v2_fields',
    NULL,
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20250128000000_add_alert_rules_v2_fields');

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT 
    gen_random_uuid()::text,
    '',
    NOW(),
    '20250129000000_add_directory_dimensions',
    NULL,
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20250129000000_add_directory_dimensions');

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT 
    gen_random_uuid()::text,
    '',
    NOW(),
    '20250130000000_add_cron_run',
    NULL,
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20250130000000_add_cron_run');

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT 
    gen_random_uuid()::text,
    '',
    NOW(),
    '20250131000000_add_ai_providers_router',
    NULL,
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20250131000000_add_ai_providers_router');

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT 
    gen_random_uuid()::text,
    '',
    NOW(),
    '20250201000000_add_ai_gateway_key_defaults_ratelimit',
    NULL,
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20250201000000_add_ai_gateway_key_defaults_ratelimit');

