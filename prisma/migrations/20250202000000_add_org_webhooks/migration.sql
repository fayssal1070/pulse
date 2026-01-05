-- CreateTable
CREATE TABLE IF NOT EXISTS "OrgWebhook" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "events" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrgWebhook_orgId_idx" ON "OrgWebhook"("orgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrgWebhook_orgId_enabled_idx" ON "OrgWebhook"("orgId", "enabled");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrgWebhook_orgId_fkey') THEN
        ALTER TABLE "OrgWebhook" ADD CONSTRAINT "OrgWebhook_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

