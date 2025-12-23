-- AlterTable
ALTER TABLE "CloudAccount" ADD COLUMN     "connectionType" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "roleArn" TEXT;

-- CreateIndex
CREATE INDEX "CloudAccount_provider_connectionType_idx" ON "CloudAccount"("provider", "connectionType");
