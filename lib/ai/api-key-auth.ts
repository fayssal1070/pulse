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
    defaultAppId: string | null
    defaultProjectId: string | null
    defaultClientId: string | null
    rateLimitRpm: number | null
    enabled: boolean
  }
}

/**
 * Authenticate API key from Authorization Bearer token
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<{ success: true; result: ApiKeyAuthResult } | { success: false; error: string; status: number }> {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid Authorization header. Use: Authorization: Bearer <API_KEY>',
      status: 401,
    }
  }

  const apiKey = authHeader.substring(7).trim()
  
  if (!apiKey) {
    return {
      success: false,
      error: 'API key is required',
      status: 401,
    }
  }

  // Hash API key (same as when created)
  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  // Find key in database
  const key = await prisma.aiGatewayKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      orgId: true,
      createdByUserId: true,
      defaultAppId: true,
      defaultProjectId: true,
      defaultClientId: true,
      rateLimitRpm: true,
      enabled: true,
      status: true,
    },
  })

  if (!key) {
    return {
      success: false,
      error: 'Invalid API key',
      status: 401,
    }
  }

  // Check if key is active and enabled
  if (key.status !== 'active' || !key.enabled) {
    return {
      success: false,
      error: 'API key is revoked or disabled',
      status: 403,
    }
  }

  return {
    success: true,
    result: {
      key: {
        id: key.id,
        orgId: key.orgId,
        createdByUserId: key.createdByUserId,
        defaultAppId: key.defaultAppId,
        defaultProjectId: key.defaultProjectId,
        defaultClientId: key.defaultClientId,
        rateLimitRpm: key.rateLimitRpm,
        enabled: key.enabled,
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
  }
): {
  appId?: string
  projectId?: string
  clientId?: string
} {
  const appId = request.headers.get('x-pulse-app') || keyDefaults.defaultAppId || undefined
  const projectId = request.headers.get('x-pulse-project') || keyDefaults.defaultProjectId || undefined
  const clientId = request.headers.get('x-pulse-client') || keyDefaults.defaultClientId || undefined

  return {
    appId: appId || undefined,
    projectId: projectId || undefined,
    clientId: clientId || undefined,
  }
}

