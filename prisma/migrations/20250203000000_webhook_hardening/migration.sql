-- PR19: Webhook hardening - encrypt secrets and add delivery logs

-- Step 1: Add new columns to OrgWebhook
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OrgWebhook' AND column_name = 'secretEnc') THEN
    ALTER TABLE "OrgWebhook" ADD COLUMN "secretEnc" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OrgWebhook' AND column_name = 'secretHash') THEN
    ALTER TABLE "OrgWebhook" ADD COLUMN "secretHash" TEXT;
  END IF;
END $$;

-- Step 2: Create OrgWebhookDelivery table
CREATE TABLE IF NOT EXISTS "OrgWebhookDelivery" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "httpStatus" INTEGER,
  "error" TEXT,
  "requestId" TEXT,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payloadJson" TEXT,
  "durationMs" INTEGER,
  CONSTRAINT "OrgWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- Step 3: Add foreign key (with error handling)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'OrgWebhookDelivery_webhookId_fkey'
  ) THEN
    ALTER TABLE "OrgWebhookDelivery" 
    ADD CONSTRAINT "OrgWebhookDelivery_webhookId_fkey" 
    FOREIGN KEY ("webhookId") REFERENCES "OrgWebhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS "OrgWebhookDelivery_webhookId_idx" ON "OrgWebhookDelivery"("webhookId");
CREATE INDEX IF NOT EXISTS "OrgWebhookDelivery_eventType_idx" ON "OrgWebhookDelivery"("eventType");
CREATE INDEX IF NOT EXISTS "OrgWebhookDelivery_status_idx" ON "OrgWebhookDelivery"("status");
CREATE INDEX IF NOT EXISTS "OrgWebhookDelivery_createdAt_idx" ON "OrgWebhookDelivery"("createdAt");
CREATE INDEX IF NOT EXISTS "OrgWebhookDelivery_orgId_idx" ON "OrgWebhookDelivery"("orgId");
CREATE INDEX IF NOT EXISTS "OrgWebhookDelivery_requestId_idx" ON "OrgWebhookDelivery"("requestId");

-- Step 5: Backfill existing secrets (migration script will handle encryption)
-- Note: This migration only adds columns. Backfill will be done by application code
-- or a separate migration script that can access encryption keys.

-- Step 6: Drop old secret column (optional - can be done in separate migration for safety)
-- For safety, we'll keep the old column for now and mark it as deprecated
-- ALTER TABLE "OrgWebhook" DROP COLUMN IF EXISTS "secret";

