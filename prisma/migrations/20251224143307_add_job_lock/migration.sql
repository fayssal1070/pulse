-- CreateTable
CREATE TABLE "JobLock" (
    "id" TEXT NOT NULL DEFAULT 'aws-cost-sync',
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobLock_pkey" PRIMARY KEY ("id")
);
