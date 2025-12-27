-- AlterTable: Add Stripe billing fields to Organization
ALTER TABLE "Organization" 
  ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripePriceId" TEXT,
  ADD COLUMN "subscriptionStatus" TEXT,
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Organization_stripeCustomerId_idx" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Organization_stripeSubscriptionId_idx" ON "Organization"("stripeSubscriptionId");

