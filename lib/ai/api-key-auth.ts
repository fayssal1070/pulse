/**
 * API Key authentication helper for OpenAI-compatible endpoints
 */

import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface ApiKeyAuthResult {
  key: {
    id: string
    orgId: string
    createdByUserId: string
    label: string | null
    defaultAppId: string | null
    defaultProjectId: string | null
    defaultClientId: string | null
    defaultTeamId: string | null
    rateLimitRpm: number | null
    enabled: boolean
    status: string
    expiresAt: Date | null
    allowedModels: string[] | null
    blockedModels: string[] | null
    requireAttribution: boolean | null
    dailyCostLimitEur: number | null
    monthlyCostLimitEur: number | null
  }
}

/**
 * Authenticate API key from Authorization Bearer token or x-api-key header
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<{ success: true; result: ApiKeyAuthResult } | { success: false; error: string; status: number }> {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization')
  let apiKey: string | null = null
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim()
  }
  
  // Fallback to x-api-key header
  if (!apiKey) {
    apiKey = request.headers.get('x-api-key')
  }
  
  if (!apiKey) {
    return {
      success: false,
      error: 'Missing API key. Use: Authorization: Bearer <API_KEY> or x-api-key: <API_KEY>',
      status: 401,
    }
  }

  // Hash API key (same as when created)
  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  // Find key in database (use findFirst with keyHash since it's indexed)
  const key = await prisma.aiGatewayKey.findFirst({
    where: { 
      keyHash,
      status: 'active',
      enabled: true,
    },
    select: {
      id: true,
      orgId: true,
      createdByUserId: true,
      label: true,
      defaultAppId: true,
      defaultProjectId: true,
      defaultClientId: true,
      defaultTeamId: true,
      rateLimitRpm: true,
      enabled: true,
      status: true,
      expiresAt: true,
      allowedModels: true,
      blockedModels: true,
      requireAttribution: true,
      dailyCostLimitEur: true,
      monthlyCostLimitEur: true,
    },
  })

  if (!key) {
    return {
      success: false,
      error: 'Invalid or inactive API key',
      status: 401,
    }
  }

  // Check expiration
  if (key.expiresAt && key.expiresAt < new Date()) {
    return {
      success: false,
      error: 'API key has expired',
      status: 401,
    }
  }

  // Update lastUsedAt (fire-and-forget, don't block request)
  prisma.aiGatewayKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  }).catch((err) => {
    console.error('Failed to update lastUsedAt:', err)
  })

  return {
    success: true,
    result: {
      key: {
        id: key.id,
        orgId: key.orgId,
        createdByUserId: key.createdByUserId,
        label: key.label,
        defaultAppId: key.defaultAppId,
        defaultProjectId: key.defaultProjectId,
        defaultClientId: key.defaultClientId,
        defaultTeamId: key.defaultTeamId,
        rateLimitRpm: key.rateLimitRpm,
        enabled: key.enabled,
        status: key.status,
        expiresAt: key.expiresAt,
        allowedModels: key.allowedModels as string[] | null,
        blockedModels: key.blockedModels as string[] | null,
        requireAttribution: key.requireAttribution,
        dailyCostLimitEur: key.dailyCostLimitEur ? parseFloat(key.dailyCostLimitEur.toString()) : null,
        monthlyCostLimitEur: key.monthlyCostLimitEur ? parseFloat(key.monthlyCostLimitEur.toString()) : null,
      },
    },
  }
}

/**
 * Resolve attribution from headers or key defaults
 */
export function resolveAttribution(
  request: NextRequest,
  keyDefaults: {
    defaultAppId: string | null
    defaultProjectId: string | null
    defaultClientId: string | null
    defaultTeamId: string | null
  }
): {
  appId?: string
  projectId?: string
  clientId?: string
  teamId?: string
} {
  const appId = request.headers.get('x-pulse-app') || keyDefaults.defaultAppId || undefined
  const projectId = request.headers.get('x-pulse-project') || keyDefaults.defaultProjectId || undefined
  const clientId = request.headers.get('x-pulse-client') || keyDefaults.defaultClientId || undefined
  const teamId = request.headers.get('x-pulse-team') || keyDefaults.defaultTeamId || undefined

  return {
    appId: appId || undefined,
    projectId: projectId || undefined,
    clientId: clientId || undefined,
    teamId: teamId || undefined,
  }
}

/**
 * Check if model is allowed/blocked by key restrictions
 */
export function checkModelRestrictions(
  requestedModel: string,
  allowedModels: string[] | null,
  blockedModels: string[] | null
): { allowed: boolean; reason?: string } {
  // If blocked list exists and contains this model (or prefix match)
  if (blockedModels && blockedModels.length > 0) {
    const isBlocked = blockedModels.some((blocked) => {
      if (blocked === requestedModel) return true
      // Support prefix matching: "gpt-4" blocks "gpt-4-turbo"
      if (requestedModel.startsWith(blocked + '-')) return true
      return false
    })
    if (isBlocked) {
      return { allowed: false, reason: `Model ${requestedModel} is blocked by API key restrictions` }
    }
  }

  // If allowed list exists, model must be in it
  if (allowedModels && allowedModels.length > 0) {
    const isAllowed = allowedModels.some((allowed) => {
      if (allowed === requestedModel) return true
      // Support prefix matching: "gpt-4" allows "gpt-4-turbo"
      if (requestedModel.startsWith(allowed + '-')) return true
      return false
    })
    if (!isAllowed) {
      return { allowed: false, reason: `Model ${requestedModel} is not in the allowed models list for this API key` }
    }
  }

  return { allowed: true }
}

/**
 * Check daily/monthly cost limits (filtered by apiKeyId)
 */
export async function checkCostLimits(
  keyId: string,
  orgId: string,
  dailyLimitEur: number | null,
  monthlyLimitEur: number | null
): Promise<{ withinLimit: boolean; reason?: string; currentDaily?: number; currentMonthly?: number }> {
  if (!dailyLimitEur && !monthlyLimitEur) {
    return { withinLimit: true }
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Aggregate costs from CostEvent filtered by apiKeyId
  if (dailyLimitEur) {
    const dailyCost = await prisma.costEvent.aggregate({
      where: {
        orgId,
        provider: 'AI',
        apiKeyId: keyId,
        occurredAt: { gte: startOfDay },
      },
      _sum: {
        amountEur: true,
      },
    })
    const currentDaily = dailyCost._sum.amountEur ? parseFloat(dailyCost._sum.amountEur.toString()) : 0
    if (currentDaily >= dailyLimitEur) {
      return { withinLimit: false, reason: `Daily cost limit of €${dailyLimitEur} exceeded (current: €${currentDaily.toFixed(2)})`, currentDaily }
    }
  }

  if (monthlyLimitEur) {
    const monthlyCost = await prisma.costEvent.aggregate({
      where: {
        orgId,
        provider: 'AI',
        apiKeyId: keyId,
        occurredAt: { gte: startOfMonth },
      },
      _sum: {
        amountEur: true,
      },
    })
    const currentMonthly = monthlyCost._sum.amountEur ? parseFloat(monthlyCost._sum.amountEur.toString()) : 0
    if (currentMonthly >= monthlyLimitEur) {
      return { withinLimit: false, reason: `Monthly cost limit of €${monthlyLimitEur} exceeded (current: €${currentMonthly.toFixed(2)})`, currentMonthly }
    }
  }

  return { withinLimit: true }
}

/**
 * Unified API key authentication and enforcement helper
 * Use this in all endpoints for consistent behavior
 */
export async function requireApiKeyAuth(
  request: NextRequest
): Promise<{
  success: true
  orgId: string
  createdByUserId: string
  apiKeyId: string
  apiKeyLabel: string | null
  defaults: {
    defaultAppId: string | null
    defaultProjectId: string | null
    defaultClientId: string | null
    defaultTeamId: string | null
  }
  restrictions: {
    allowedModels: string[] | null
    blockedModels: string[] | null
    requireAttribution: boolean | null
  }
  limits: {
    rateLimitRpm: number | null
    dailyCostLimitEur: number | null
    monthlyCostLimitEur: number | null
  }
} | {
  success: false
  error: string
  status: number
}> {
  const authResult = await authenticateApiKey(request)
  if (!authResult.success) {
    return authResult
  }

  const key = authResult.result.key

  return {
    success: true,
    orgId: key.orgId,
    createdByUserId: key.createdByUserId,
    apiKeyId: key.id,
    apiKeyLabel: key.label || null,
    defaults: {
      defaultAppId: key.defaultAppId,
      defaultProjectId: key.defaultProjectId,
      defaultClientId: key.defaultClientId,
      defaultTeamId: key.defaultTeamId,
    },
    restrictions: {
      allowedModels: key.allowedModels,
      blockedModels: key.blockedModels,
      requireAttribution: key.requireAttribution,
    },
    limits: {
      rateLimitRpm: key.rateLimitRpm,
      dailyCostLimitEur: key.dailyCostLimitEur,
      monthlyCostLimitEur: key.monthlyCostLimitEur,
    },
  }
}

