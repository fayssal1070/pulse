-- AlterTable: Add teamId to Membership
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "teamId" TEXT;

-- CreateTable: Team
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Project
CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable: App
CREATE TABLE IF NOT EXISTS "App" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Client
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add dimension columns to CostEvent
ALTER TABLE "CostEvent" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "CostEvent" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "CostEvent" ADD COLUMN IF NOT EXISTS "appId" TEXT;
ALTER TABLE "CostEvent" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- AlterTable: Add requireAttribution to AiPolicy
ALTER TABLE "AiPolicy" ADD COLUMN IF NOT EXISTS "requireAttribution" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey: Membership.teamId -> Team.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Membership_teamId_fkey'
    ) THEN
        ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" 
            FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Team.orgId -> Organization.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Team_orgId_fkey'
    ) THEN
        ALTER TABLE "Team" ADD CONSTRAINT "Team_orgId_fkey" 
            FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Project.orgId -> Organization.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Project_orgId_fkey'
    ) THEN
        ALTER TABLE "Project" ADD CONSTRAINT "Project_orgId_fkey" 
            FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: App.orgId -> Organization.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'App_orgId_fkey'
    ) THEN
        ALTER TABLE "App" ADD CONSTRAINT "App_orgId_fkey" 
            FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Client.orgId -> Organization.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Client_orgId_fkey'
    ) THEN
        ALTER TABLE "Client" ADD CONSTRAINT "Client_orgId_fkey" 
            FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: CostEvent.teamId -> Team.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CostEvent_teamId_fkey'
    ) THEN
        ALTER TABLE "CostEvent" ADD CONSTRAINT "CostEvent_teamId_fkey" 
            FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: CostEvent.projectId -> Project.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CostEvent_projectId_fkey'
    ) THEN
        ALTER TABLE "CostEvent" ADD CONSTRAINT "CostEvent_projectId_fkey" 
            FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: CostEvent.appId -> App.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CostEvent_appId_fkey'
    ) THEN
        ALTER TABLE "CostEvent" ADD CONSTRAINT "CostEvent_appId_fkey" 
            FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: CostEvent.clientId -> Client.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CostEvent_clientId_fkey'
    ) THEN
        ALTER TABLE "CostEvent" ADD CONSTRAINT "CostEvent_clientId_fkey" 
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: AiRequestLog.teamId -> Team.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AiRequestLog_teamId_fkey'
    ) THEN
        ALTER TABLE "AiRequestLog" ADD CONSTRAINT "AiRequestLog_teamId_fkey" 
            FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: AiRequestLog.projectId -> Project.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AiRequestLog_projectId_fkey'
    ) THEN
        ALTER TABLE "AiRequestLog" ADD CONSTRAINT "AiRequestLog_projectId_fkey" 
            FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: AiRequestLog.appId -> App.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AiRequestLog_appId_fkey'
    ) THEN
        ALTER TABLE "AiRequestLog" ADD CONSTRAINT "AiRequestLog_appId_fkey" 
            FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: AiRequestLog.clientId -> Client.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AiRequestLog_clientId_fkey'
    ) THEN
        ALTER TABLE "AiRequestLog" ADD CONSTRAINT "AiRequestLog_clientId_fkey" 
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex: Team indexes
CREATE INDEX IF NOT EXISTS "Team_orgId_idx" ON "Team"("orgId");
CREATE INDEX IF NOT EXISTS "Team_orgId_name_idx" ON "Team"("orgId", "name");

-- CreateIndex: Project indexes
CREATE INDEX IF NOT EXISTS "Project_orgId_idx" ON "Project"("orgId");
CREATE INDEX IF NOT EXISTS "Project_orgId_name_idx" ON "Project"("orgId", "name");

-- CreateIndex: App indexes
CREATE INDEX IF NOT EXISTS "App_orgId_idx" ON "App"("orgId");
CREATE INDEX IF NOT EXISTS "App_orgId_name_idx" ON "App"("orgId", "name");
CREATE INDEX IF NOT EXISTS "App_orgId_slug_idx" ON "App"("orgId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "App_orgId_slug_key" ON "App"("orgId", "slug");

-- CreateIndex: Client indexes
CREATE INDEX IF NOT EXISTS "Client_orgId_idx" ON "Client"("orgId");
CREATE INDEX IF NOT EXISTS "Client_orgId_name_idx" ON "Client"("orgId", "name");
CREATE INDEX IF NOT EXISTS "Client_orgId_externalId_idx" ON "Client"("orgId", "externalId");

-- CreateIndex: Membership.teamId
CREATE INDEX IF NOT EXISTS "Membership_teamId_idx" ON "Membership"("teamId");

-- CreateIndex: CostEvent dimension indexes
CREATE INDEX IF NOT EXISTS "CostEvent_orgId_teamId_idx" ON "CostEvent"("orgId", "teamId");
CREATE INDEX IF NOT EXISTS "CostEvent_orgId_projectId_idx" ON "CostEvent"("orgId", "projectId");
CREATE INDEX IF NOT EXISTS "CostEvent_orgId_appId_idx" ON "CostEvent"("orgId", "appId");
CREATE INDEX IF NOT EXISTS "CostEvent_orgId_clientId_idx" ON "CostEvent"("orgId", "clientId");

