/**
 * Rate limiting for API keys (60s windows)
 * Fail-soft: if DB error, allow request (don't block)
 */

import { prisma } from '@/lib/prisma'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Check and increment rate limit for API key
 * @param keyId - API key ID
 * @param limitRpm - Rate limit per minute (null = unlimited)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  keyId: string,
  limitRpm: number | null
): Promise<RateLimitResult> {
  // If no limit, allow all requests
  if (limitRpm === null || limitRpm === undefined || limitRpm <= 0) {
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: new Date(Date.now() + 60000), // Next minute
    }
  }

  try {
    // Truncate to minute boundary (60s windows)
    const now = new Date()
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)

    // Upsert usage window
    const window = await prisma.apiKeyUsageWindow.upsert({
      where: {
        keyId_windowStart: {
          keyId,
          windowStart,
        },
      },
      create: {
        keyId,
        windowStart,
        count: 1,
      },
      update: {
        count: {
          increment: 1,
        },
      },
    })

    const remaining = Math.max(0, limitRpm - window.count)
    const resetAt = new Date(windowStart.getTime() + 60000) // Next minute

    return {
      allowed: window.count <= limitRpm,
      remaining,
      resetAt,
    }
  } catch (error) {
    // Fail-soft: if DB error, allow request (don't block)
    console.error('Rate limit check error (fail-soft):', error)
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: new Date(Date.now() + 60000),
    }
  }
}

