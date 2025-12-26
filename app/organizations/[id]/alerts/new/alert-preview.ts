'use client'

export async function getCurrentMonthCosts(orgId: string): Promise<number> {
  const res = await fetch(`/api/organizations/${orgId}/alerts/preview/monthly`)
  if (!res.ok) {
    throw new Error('Failed to fetch monthly costs')
  }
  const data = await res.json()
  return data.spentMTD || 0
}

export async function getDailySpikePreview(
  orgId: string,
  lookbackDays: number
): Promise<{
  todayAmount: number
  baselineAverage: number
  spikePercent: number
}> {
  const res = await fetch(
    `/api/organizations/${orgId}/alerts/preview/daily-spike?lookbackDays=${lookbackDays}`
  )
  if (!res.ok) {
    throw new Error('Failed to fetch daily spike preview')
  }
  const data = await res.json()
  return data
}

