import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getActiveOrganization } from '@/lib/active-org'
import { processAiRequest, type AiRequestInput } from '@/lib/ai/gateway'
import { requireApiKeyAuth, resolveAttribution, checkModelRestrictions, checkCostLimits } from '@/lib/ai/api-key-auth'
import { checkRateLimit } from '@/lib/ratelimit'

/**
 * GET /api/ai/request
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeOrg = await getActiveOrganization(session.user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'AI Gateway is ready',
      orgId: activeOrg.id,
      endpoint: '/api/ai/request',
      methods: ['POST'],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ai/request
 * Process AI request through gateway
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Try API key auth first, fallback to session auth
    let orgId: string
    let userId: string
    let apiKeyId: string | undefined
    let apiKeyLabel: string | null | undefined
    let defaults = {
      defaultAppId: null as string | null,
      defaultProjectId: null as string | null,
      defaultClientId: null as string | null,
      defaultTeamId: null as string | null,
    }
    let keyRestrictions: {
      allowedModels: string[] | null
      blockedModels: string[] | null
      requireAttribution: boolean | null
    } = {
      allowedModels: null,
      blockedModels: null,
      requireAttribution: null,
    }

    const apiKeyAuth = await requireApiKeyAuth(request)
    if (apiKeyAuth.success) {
      // API key authentication
      orgId = apiKeyAuth.orgId
      userId = apiKeyAuth.createdByUserId
      apiKeyId = apiKeyAuth.apiKeyId
      apiKeyLabel = apiKeyAuth.apiKeyLabel
      defaults = apiKeyAuth.defaults
      keyRestrictions = apiKeyAuth.restrictions

      // Check rate limit
      if (apiKeyAuth.limits.rateLimitRpm !== null && apiKeyAuth.limits.rateLimitRpm > 0) {
        const rateLimitResult = await checkRateLimit(apiKeyId, apiKeyAuth.limits.rateLimitRpm)
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          )
        }
      }

      // Check model restrictions
      if (body.model) {
        const modelCheck = checkModelRestrictions(
          body.model,
          keyRestrictions.allowedModels,
          keyRestrictions.blockedModels
        )
        if (!modelCheck.allowed) {
          return NextResponse.json(
            { error: modelCheck.reason || 'Model not allowed' },
            { status: 403 }
          )
        }
      }

      // Check cost limits
      if (apiKeyAuth.limits.dailyCostLimitEur || apiKeyAuth.limits.monthlyCostLimitEur) {
        const costCheck = await checkCostLimits(
          apiKeyId,
          orgId,
          apiKeyAuth.limits.dailyCostLimitEur,
          apiKeyAuth.limits.monthlyCostLimitEur
        )
        if (!costCheck.withinLimit) {
          return NextResponse.json(
            { error: costCheck.reason || 'Cost limit exceeded' },
            { status: 403 }
          )
        }
      }
    } else {
      // Fallback to session authentication
      const session = await auth()
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized. Use API key or session authentication.' }, { status: 401 })
      }
      const user = session.user

      const activeOrg = await getActiveOrganization(user.id)
      if (!activeOrg) {
        return NextResponse.json({ error: 'No active organization' }, { status: 400 })
      }

      orgId = activeOrg.id
      userId = user.id
    }

    // Extract dimensions from headers (x-pulse-*) or body, applying defaults if from API key
    let teamId = request.headers.get('x-pulse-team') || body.teamId
    let projectId = request.headers.get('x-pulse-project') || body.projectId
    let appId = request.headers.get('x-pulse-app') || body.appId
    let clientId = request.headers.get('x-pulse-client') || body.clientId
    const tags = body.tags || []

    // Apply API key defaults if using API key auth and dimensions not provided
    if (apiKeyId) {
      const attribution = resolveAttribution(request, defaults)
      teamId = teamId || attribution.teamId || undefined
      projectId = projectId || attribution.projectId || undefined
      appId = appId || attribution.appId || undefined
      clientId = clientId || attribution.clientId || undefined
    }

    // Derive teamId from membership if not provided (only for session auth)
    if (!apiKeyId && !teamId) {
      const { prisma } = await import('@/lib/prisma')
      const membership = await prisma.membership.findUnique({
        where: {
          userId_orgId: {
            userId: userId,
            orgId: orgId,
          },
        },
        select: { teamId: true },
      })
      if (membership?.teamId) {
        teamId = membership.teamId
      }
    }

    // Validate dimension IDs belong to org
    const { prisma } = await import('@/lib/prisma')
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, orgId: orgId },
      })
      if (!project) {
        return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
      }
    }
    if (appId) {
      const app = await prisma.app.findFirst({
        where: { id: appId, orgId: orgId },
      })
      if (!app) {
        return NextResponse.json({ error: 'Invalid appId' }, { status: 400 })
      }
    }
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, orgId: orgId },
      })
      if (!client) {
        return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 })
      }
    }
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: { id: teamId, orgId: orgId },
      })
      if (!team) {
        return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 })
      }
    }

    // Check requireAttribution policy (key-level override or org policy)
    let requiresAttribution = keyRestrictions.requireAttribution
    if (requiresAttribution === null) {
      const policies = await prisma.aiPolicy.findMany({
        where: {
          orgId: orgId,
          enabled: true,
        },
      })
      requiresAttribution = policies.some((p: any) => p.enabled && p.requireAttribution)
    }
    if (requiresAttribution && !appId) {
      return NextResponse.json(
        { error: 'appId required by policy. Create an App in /directory then pass x-pulse-app header or appId in request body.' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.model) {
      return NextResponse.json({ error: 'model is required' }, { status: 400 })
    }
    if (!body.input && !body.messages && !body.prompt) {
      return NextResponse.json(
        { error: 'Either input, messages, or prompt is required' },
        { status: 400 }
      )
    }

    // Build request input
    const aiInput: AiRequestInput = {
      orgId: orgId,
      userId: userId,
      teamId: teamId || undefined,
      projectId: projectId || undefined,
      appId: appId || undefined,
      clientId: clientId || undefined,
      apiKeyId: apiKeyId,
      apiKeyLabel: apiKeyLabel,
      model: body.model,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      metadata: {
        ...body.metadata,
        tags,
      },
    }

    // Handle different input formats
    if (body.messages) {
      aiInput.messages = body.messages
    } else if (body.prompt) {
      aiInput.prompt = body.prompt
    } else if (body.input) {
      // If input is string, treat as prompt; if array, treat as messages
      if (typeof body.input === 'string') {
        aiInput.prompt = body.input
      } else {
        aiInput.messages = body.input
      }
    }

    const result = await processAiRequest(aiInput)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'AI request failed' },
        { status: result.error?.includes('blocked') ? 403 : 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    // Log error without exposing API keys
    const errorMessage = error.message || 'AI request failed'
    const sanitizedError = errorMessage
      .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]')
      .replace(/OPENAI_API_KEY/g, '[API_KEY]')
    console.error('AI request error:', sanitizedError)
    
    // Return user-friendly error
    const userError = errorMessage.includes('OPENAI_API_KEY')
      ? 'AI Gateway is not configured. Please contact your administrator.'
      : sanitizedError
    
    // Don't return 404 - return proper error codes
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json({ error: userError }, { status: 500 })
  }
}
