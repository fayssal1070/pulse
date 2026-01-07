/**
 * Upgrade error detection and normalization
 * Handles PR26/PR27 upgrade_required error responses
 */

export interface UpgradeErrorData {
  code: 'upgrade_required'
  feature: string
  plan: string
  required: string
  message: string
}

export class UpgradeRequiredError extends Error {
  public readonly code = 'upgrade_required'
  public readonly feature: string
  public readonly plan: string
  public readonly required: string

  constructor(data: UpgradeErrorData) {
    super(data.message)
    this.name = 'UpgradeRequiredError'
    this.feature = data.feature
    this.plan = data.plan
    this.required = data.required
  }

  toJSON() {
    return {
      code: this.code,
      feature: this.feature,
      plan: this.plan,
      required: this.required,
      message: this.message,
    }
  }
}

/**
 * Check if an error response indicates upgrade required
 */
export function isUpgradeRequired(error: any): boolean {
  if (!error) return false
  
  // Check if it's already an UpgradeRequiredError
  if (error instanceof UpgradeRequiredError) return true
  
  // Check if it's a JSON response with upgrade_required code
  if (typeof error === 'object' && error.code === 'upgrade_required') return true
  
  // Check response object (from fetch)
  if (error.response && typeof error.response === 'object' && error.response.code === 'upgrade_required') return true
  
  return false
}

/**
 * Normalize upgrade error from API response
 */
export function normalizeUpgradeError(respJson: any): UpgradeErrorData {
  return {
    code: 'upgrade_required',
    feature: respJson.feature || 'unknown',
    plan: respJson.plan || 'STARTER',
    required: respJson.required || 'PRO',
    message: respJson.message || 'This feature requires an upgrade',
  }
}

