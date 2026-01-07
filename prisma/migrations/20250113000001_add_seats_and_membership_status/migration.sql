-- PR29: Add seat-based billing fields to Organization and Membership status tracking

-- Add seat fields to Organization
ALTER TABLE "Organization" 
ADD COLUMN IF NOT EXISTS "seatLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "seatEnforcement" BOOLEAN NOT NULL DEFAULT true;

-- Add status fields to Membership
ALTER TABLE "Membership"
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS "invitedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);

-- Create index on membership status for efficient queries
CREATE INDEX IF NOT EXISTS "Membership_status_idx" ON "Membership"("status");
CREATE INDEX IF NOT EXISTS "Membership_orgId_status_idx" ON "Membership"("orgId", "status");

-- Update existing memberships to have 'active' status
UPDATE "Membership" SET "status" = 'active' WHERE "status" IS NULL;

-- Set seatLimit based on plan (STARTER: 1, PRO: 5, BUSINESS: 25)
UPDATE "Organization" SET "seatLimit" = 1 WHERE "plan" = 'STARTER' OR "plan" = 'FREE' OR "plan" IS NULL;
UPDATE "Organization" SET "seatLimit" = 5 WHERE "plan" = 'PRO';
UPDATE "Organization" SET "seatLimit" = 25 WHERE "plan" = 'BUSINESS';

