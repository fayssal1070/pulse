import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { processAiRequest, type AiRequestInput } from '@/lib/ai/gateway'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const body = await request.json()

    // Extract dimensions from headers (x-pulse-*) or body
    const teamId = request.headers.get('x-pulse-team') || body.teamId
    const projectId = request.headers.get('x-pulse-project') || body.projectId
    const appId = request.headers.get('x-pulse-app') || body.appId
    const clientId = request.headers.get('x-pulse-client') || body.clientId
    const tags = body.tags || []

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
    
    return NextResponse.json({ error: userError }, { status: 500 })
  }
}

