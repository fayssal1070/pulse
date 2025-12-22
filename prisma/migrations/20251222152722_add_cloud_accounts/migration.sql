-- CreateTable
CREATE TABLE "CloudAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountIdentifier" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CloudAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CloudAccount_orgId_idx" ON "CloudAccount"("orgId");

-- CreateIndex
CREATE INDEX "CloudAccount_status_idx" ON "CloudAccount"("status");

-- AddForeignKey
ALTER TABLE "CloudAccount" ADD CONSTRAINT "CloudAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
