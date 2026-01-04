/**
 * OpenAI-compatible chat completions endpoint
 * POST /api/v1/chat/completions
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
              param: null,
              code: 'rate_limit_exceeded',
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': key.rateLimitRpm.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
            },
          }
        )
      }
    }

    // Parse OpenAI request body
    const body = await request.json().catch(() => ({}))
    const { model, messages, max_tokens, temperature } = body

    if (!model) {
      return NextResponse.json(
        {
          error: {
            message: 'model is required',
            type: 'invalid_request_error',
            param: 'model',
            code: 'missing_parameter',
          },
        },
        { status: 400 }
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: 'messages is required and must be a non-empty array',
            type: 'invalid_request_error',
            param: 'messages',
            code: 'missing_parameter',
          },
        },
        { status: 400 }
      )
    }

    // Resolve attribution from headers or key defaults
    const attribution = resolveAttribution(request, {
      defaultAppId: key.defaultAppId,
      defaultProjectId: key.defaultProjectId,
      defaultClientId: key.defaultClientId,
    })

    // Process request through gateway
    const gatewayResponse = await processAiRequest({
      orgId: key.orgId,
      userId: key.createdByUserId, // Use key creator as userId
      teamId: undefined, // API keys don't have team context
      projectId: attribution.projectId,
      appId: attribution.appId,
      clientId: attribution.clientId,
      model,
      messages,
      maxTokens: max_tokens,
      temperature,
    })

    if (!gatewayResponse.success) {
      return NextResponse.json(
        {
          error: {
            message: gatewayResponse.error || 'AI request failed',
            type: 'server_error',
            param: null,
            code: 'internal_error',
          },
        },
        { status: 500 }
      )
    }

    // Format OpenAI-compatible response
    const response = {
      id: `chatcmpl-${gatewayResponse.requestId || Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: gatewayResponse.model || model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: gatewayResponse.content || '',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: gatewayResponse.inputTokens || 0,
        completion_tokens: gatewayResponse.outputTokens || 0,
        total_tokens: gatewayResponse.totalTokens || 0,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Chat completions error:', error)
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Internal server error',
          type: 'server_error',
          param: null,
          code: 'internal_error',
        },
      },
      { status: 500 }
    )
  }
}

