-- CreateTable IF NOT EXISTS for CronRun (PR13 - Production Hardening)
-- Safe migration: uses IF NOT EXISTS to avoid errors if table already exists

CREATE TABLE IF NOT EXISTS "CronRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "metaJson" TEXT,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- Create indexes IF NOT EXISTS (safe)
CREATE INDEX IF NOT EXISTS "CronRun_type_idx" ON "CronRun"("type");
CREATE INDEX IF NOT EXISTS "CronRun_status_idx" ON "CronRun"("status");
CREATE INDEX IF NOT EXISTS "CronRun_startedAt_idx" ON "CronRun"("startedAt");
CREATE INDEX IF NOT EXISTS "CronRun_type_startedAt_idx" ON "CronRun"("type", "startedAt");
CREATE INDEX IF NOT EXISTS "CronRun_orgId_idx" ON "CronRun"("orgId");

-- Add foreign key constraint IF NOT EXISTS (safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'CronRun_orgId_fkey'
    ) THEN
        ALTER TABLE "CronRun" ADD CONSTRAINT "CronRun_orgId_fkey" 
        FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

