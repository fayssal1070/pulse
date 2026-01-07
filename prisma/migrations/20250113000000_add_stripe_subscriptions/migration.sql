-- Add Stripe subscription fields to Organization (if not exists)
DO $$ 
BEGIN
  -- Add trialEndsAt if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Organization' AND column_name = 'trialEndsAt'
  ) THEN
    ALTER TABLE "Organization" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
  END IF;

  -- Update plan default to STARTER (if it's FREE)
  UPDATE "Organization" SET "plan" = 'STARTER' WHERE "plan" = 'FREE' OR "plan" IS NULL;

  -- Make stripeCustomerId and stripeSubscriptionId unique if not already
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Organization_stripeCustomerId_key'
  ) THEN
    ALTER TABLE "Organization" ADD CONSTRAINT "Organization_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Organization_stripeSubscriptionId_key'
  ) THEN
    ALTER TABLE "Organization" ADD CONSTRAINT "Organization_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");
  END IF;
END $$;

-- Create StripeEvent table for webhook idempotence
CREATE TABLE IF NOT EXISTS "StripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "orgId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,

  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "StripeEvent_type_idx" ON "StripeEvent"("type");
CREATE INDEX IF NOT EXISTS "StripeEvent_status_idx" ON "StripeEvent"("status");
CREATE INDEX IF NOT EXISTS "StripeEvent_createdAt_idx" ON "StripeEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "StripeEvent_orgId_idx" ON "StripeEvent"("orgId");

-- Add foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'StripeEvent_orgId_fkey'
  ) THEN
    ALTER TABLE "StripeEvent" ADD CONSTRAINT "StripeEvent_orgId_fkey" 
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

