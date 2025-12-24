import { prisma } from './prisma'
import { SYNC_CONFIG } from './aws-sync-config'

const LOCK_ID = 'aws-cost-sync'

/**
 * Acquire a job lock. Returns true if lock was acquired, false if already locked.
 */
export async function acquireJobLock(): Promise<boolean> {
  try {
    const now = new Date()
    const lockedUntil = new Date(now.getTime() + SYNC_CONFIG.SYNC_LOCK_TTL_SECONDS * 1000)

    // Check if lock exists and is still valid
    const existingLock = await prisma.jobLock.findUnique({
      where: { id: LOCK_ID },
    })

    if (existingLock && existingLock.lockedUntil > now) {
      // Lock is still held by another process
      return false
    }

    // Lock expired or doesn't exist - we can acquire it
    await prisma.jobLock.upsert({
      where: { id: LOCK_ID },
      create: {
        id: LOCK_ID,
        lockedUntil,
      },
      update: {
        lockedUntil,
      },
    })

    return true
  } catch (error) {
    console.error('Error acquiring job lock:', error)
    return false
  }
}

/**
 * Release the job lock
 */
export async function releaseJobLock(): Promise<void> {
  try {
    await prisma.jobLock.update({
      where: { id: LOCK_ID },
      data: {
        lockedUntil: new Date(), // Release immediately
      },
    })
  } catch (error) {
    console.error('Error releasing job lock:', error)
  }
}

/**
 * Check if lock is currently held
 */
export async function isLocked(): Promise<boolean> {
  try {
    const lock = await prisma.jobLock.findUnique({
      where: { id: LOCK_ID },
    })

    if (!lock) {
      return false
    }

    return lock.lockedUntil > new Date()
  } catch (error) {
    console.error('Error checking lock status:', error)
    return false
  }
}

