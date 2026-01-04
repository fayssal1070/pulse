import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getActiveOrganization } from '@/lib/active-org'
import { processAiRequest, type AiRequestInput } from '@/lib/ai/gateway'

export async function POST(request: NextRequest) {
  try {
    // Check authentication directly (don't use requireAuth as it redirects)
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user

    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const body = await request.json()

    // Extract dimensions from headers (x-pulse-*) or body
    let teamId = request.headers.get('x-pulse-team') || body.teamId
    const projectId = request.headers.get('x-pulse-project') || body.projectId
    const appId = request.headers.get('x-pulse-app') || body.appId
    const clientId = request.headers.get('x-pulse-client') || body.clientId
    const tags = body.tags || []

    // Derive teamId from membership if not provided
    if (!teamId) {
      const { prisma } = await import('@/lib/prisma')
      const membership = await prisma.membership.findUnique({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId: activeOrg.id,
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
        where: { id: projectId, orgId: activeOrg.id },
      })
      if (!project) {
        return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
      }
    }
    if (appId) {
      const app = await prisma.app.findFirst({
        where: { id: appId, orgId: activeOrg.id },
      })
      if (!app) {
        return NextResponse.json({ error: 'Invalid appId' }, { status: 400 })
      }
    }
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, orgId: activeOrg.id },
      })
      if (!client) {
        return NextResponse.json({ error: 'Invalid clientId' }, { status: 400 })
      }
    }
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: { id: teamId, orgId: activeOrg.id },
      })
      if (!team) {
        return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 })
      }
    }

    // Check requireAttribution policy
    const policies = await prisma.aiPolicy.findMany({
      where: {
        orgId: activeOrg.id,
        enabled: true,
      },
    })
    const hasRequireAttribution = policies.some((p: any) => p.enabled && p.requireAttribution)
    if (hasRequireAttribution && !appId) {
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
      orgId: activeOrg.id,
      userId: user.id,
      teamId: teamId || undefined,
      projectId: projectId || undefined,
      appId: appId || undefined,
      clientId: clientId || undefined,
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
