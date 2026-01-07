/**
 * Fetch JSON wrapper with upgrade error handling
 * Intercepts 402/403 responses with upgrade_required code and throws UpgradeRequiredError
 */

import { UpgradeRequiredError, normalizeUpgradeError, isUpgradeRequired } from './upgrade-error'

export async function fetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await response.json()

  // Check for upgrade_required errors (402/403)
  if ((response.status === 402 || response.status === 403) && isUpgradeRequired(data)) {
    throw new UpgradeRequiredError(normalizeUpgradeError(data))
  }

  // Check for other errors
  if (!response.ok) {
    const error = new Error(data.error || data.message || `HTTP ${response.status}`)
    ;(error as any).status = response.status
    ;(error as any).response = data
    throw error
  }

  return data
}

