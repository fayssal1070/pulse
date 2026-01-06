-- Migration: Add Slack + Teams notifications + NotificationDelivery tracking
-- Safe migration with IF NOT EXISTS and DO blocks

-- Add Slack and Teams fields to NotificationPreference
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'NotificationPreference' AND column_name = 'slackEnabled'
  ) THEN
    ALTER TABLE "NotificationPreference" ADD COLUMN "slackEnabled" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'NotificationPreference' AND column_name = 'teamsEnabled'
  ) THEN
    ALTER TABLE "NotificationPreference" ADD COLUMN "teamsEnabled" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add Slack and Teams fields to OrgIntegration
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'OrgIntegration' AND column_name = 'slackWebhookUrlEnc'
  ) THEN
    ALTER TABLE "OrgIntegration" ADD COLUMN "slackWebhookUrlEnc" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'OrgIntegration' AND column_name = 'slackWebhookUrlLast4'
  ) THEN
    ALTER TABLE "OrgIntegration" ADD COLUMN "slackWebhookUrlLast4" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'OrgIntegration' AND column_name = 'teamsWebhookUrlEnc'
  ) THEN
    ALTER TABLE "OrgIntegration" ADD COLUMN "teamsWebhookUrlEnc" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'OrgIntegration' AND column_name = 'teamsWebhookUrlLast4'
  ) THEN
    ALTER TABLE "OrgIntegration" ADD COLUMN "teamsWebhookUrlLast4" TEXT;
  END IF;
END $$;

-- Create NotificationDelivery table
CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "notificationId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- Create indexes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'NotificationDelivery_orgId_status_idx'
  ) THEN
    CREATE INDEX "NotificationDelivery_orgId_status_idx" ON "NotificationDelivery"("orgId", "status");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'NotificationDelivery_nextRetryAt_idx'
  ) THEN
    CREATE INDEX "NotificationDelivery_nextRetryAt_idx" ON "NotificationDelivery"("nextRetryAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'NotificationDelivery_channel_idx'
  ) THEN
    CREATE INDEX "NotificationDelivery_channel_idx" ON "NotificationDelivery"("channel");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'NotificationDelivery_orgId_idx'
  ) THEN
    CREATE INDEX "NotificationDelivery_orgId_idx" ON "NotificationDelivery"("orgId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'NotificationDelivery_status_nextRetryAt_idx'
  ) THEN
    CREATE INDEX "NotificationDelivery_status_nextRetryAt_idx" ON "NotificationDelivery"("status", "nextRetryAt");
  END IF;
END $$;

-- Add foreign key constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'NotificationDelivery_orgId_fkey'
  ) THEN
    ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_orgId_fkey" 
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

