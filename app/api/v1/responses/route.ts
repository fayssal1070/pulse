/**
 * OpenAI-compatible responses endpoint (new API)
 * POST /api/v1/responses
 * Maps to chat/completions internally
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey, resolveAttribution } from '@/lib/ai/api-key-auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { processAiRequest } from '@/lib/ai/gateway'

export async function POST(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { key } = authResult.result

    // Check rate limit
    if (key.rateLimitRpm !== null && key.rateLimitRpm > 0) {
      const rateLimitResult = await checkRateLimit(key.id, key.rateLimitRpm)
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: {
              message: 'Rate limit exceeded',
              type: 'rate_limit_error',
              code: 'rate_limit_exceeded',
            },
          },
          { status: 429 }
        )
      }
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { input, model = 'gpt-4', stream } = body

    if (!input) {
      return NextResponse.json(
        {
          error: {
            message: 'input is required',
            type: 'invalid_request_error',
            param: 'input',
            code: 'missing_parameter',
          },
        },
        { status: 400 }
      )
    }

    // Resolve attribution
    const attribution = resolveAttribution(request, {
      defaultAppId: key.defaultAppId,
      defaultProjectId: key.defaultProjectId,
      defaultClientId: key.defaultClientId,
    })

    // Convert input to messages format (for chat/completions)
    const messages = Array.isArray(input)
      ? input.map((msg) => (typeof msg === 'string' ? { role: 'user', content: msg } : msg))
      : [{ role: 'user', content: input }]

    // Handle streaming
    if (stream === true) {
      const { createStreamingResponse } = await import('../chat/completions-stream')
      const streamResponse = await createStreamingResponse(
        key.orgId,
        key.createdByUserId,
        model,
        messages,
        undefined,
        undefined,
        request.headers.get('x-pulse-team') || undefined,
        attribution.projectId,
        attribution.appId,
        attribution.clientId
      )

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Process through gateway (same as chat/completions)
    const gatewayResponse = await processAiRequest({
      orgId: key.orgId,
      userId: key.createdByUserId,
      teamId: request.headers.get('x-pulse-team') || undefined,
      projectId: attribution.projectId,
      appId: attribution.appId,
      clientId: attribution.clientId,
      model,
      messages,
      metadata: {
        source: 'openai-compat-v1-responses',
        apiKeyId: key.id,
      },
    })

    if (!gatewayResponse.success) {
      return NextResponse.json(
        {
          error: {
            message: gatewayResponse.error || 'AI request failed',
            type: 'server_error',
            code: 'internal_error',
          },
        },
        { status: 500 }
      )
    }

    // Format OpenAI responses API format (simplified - maps to chat format)
    const response = {
      id: `resp_${gatewayResponse.requestId || Date.now()}`,
      object: 'response',
      created: Math.floor(Date.now() / 1000),
      model: gatewayResponse.model || model,
      output_text: {
        text: gatewayResponse.content || '',
      },
      usage: {
        prompt_tokens: gatewayResponse.inputTokens || 0,
        completion_tokens: gatewayResponse.outputTokens || 0,
        total_tokens: gatewayResponse.totalTokens || 0,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Responses error:', error)
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Internal server error',
          type: 'server_error',
          code: 'internal_error',
        },
      },
      { status: 500 }
    )
  }
}

