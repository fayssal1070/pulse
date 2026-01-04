'use server'

import { requireAdmin } from '@/lib/admin-helpers'

export async function runCronAlerts() {
  try {
    await requireAdmin()
    
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      throw new Error('CRON_SECRET not configured')
    }

    // Get the base URL from environment or use localhost for dev
    let baseUrl = 'http://localhost:3000'
    if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }

    const response = await fetch(`${baseUrl}/api/cron/run-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cronSecret}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || 'Cron execution failed')
    }

    return await response.json()
  } catch (error: any) {
    throw new Error(error.message || 'Failed to run cron')
  }
}

