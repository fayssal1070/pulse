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

