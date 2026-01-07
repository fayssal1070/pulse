-- PR30: Add MonthlyUsage model for overage billing tracking

CREATE TABLE IF NOT EXISTS "MonthlyUsage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalSpendEUR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "includedSpendEUR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overageSpendEUR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overageAmountEUR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "stripeInvoiceItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyUsage_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for (orgId, year, month)
CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyUsage_orgId_year_month_key" ON "MonthlyUsage"("orgId", "year", "month");

-- Create indexes
CREATE INDEX IF NOT EXISTS "MonthlyUsage_orgId_idx" ON "MonthlyUsage"("orgId");
CREATE INDEX IF NOT EXISTS "MonthlyUsage_year_month_idx" ON "MonthlyUsage"("year", "month");
CREATE INDEX IF NOT EXISTS "MonthlyUsage_finalized_idx" ON "MonthlyUsage"("finalized");

-- Add foreign key
ALTER TABLE "MonthlyUsage" ADD CONSTRAINT "MonthlyUsage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

