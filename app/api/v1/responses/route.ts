/**
 * OpenAI-compatible responses endpoint (new API)
 * POST /api/v1/responses
 * Maps to chat/completions internally
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireApiKeyAuth, resolveAttribution, checkModelRestrictions, checkCostLimits } from '@/lib/ai/api-key-auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { processAiRequest } from '@/lib/ai/gateway'

export async function POST(request: NextRequest) {
  try {
    // Authenticate API key (unified helper)
    const authResult = await requireApiKeyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    // Check rate limit
    if (authResult.limits.rateLimitRpm !== null && authResult.limits.rateLimitRpm > 0) {
      const rateLimitResult = await checkRateLimit(authResult.apiKeyId, authResult.limits.rateLimitRpm)
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

    // Check model restrictions
    if (model) {
      const modelCheck = checkModelRestrictions(
        model,
        authResult.restrictions.allowedModels,
        authResult.restrictions.blockedModels
      )
      if (!modelCheck.allowed) {
        return NextResponse.json(
          {
            error: {
              message: modelCheck.reason || 'Model not allowed',
              type: 'invalid_request_error',
              param: 'model',
              code: 'model_restricted',
            },
          },
          { status: 403 }
        )
      }
    }

    // Check cost limits
    if (authResult.limits.dailyCostLimitEur || authResult.limits.monthlyCostLimitEur) {
      const costCheck = await checkCostLimits(
        authResult.apiKeyId,
        authResult.orgId,
        authResult.limits.dailyCostLimitEur,
        authResult.limits.monthlyCostLimitEur
      )
      if (!costCheck.withinLimit) {
        return NextResponse.json(
          {
            error: {
              message: costCheck.reason || 'Cost limit exceeded',
              type: 'insufficient_quota_error',
              param: null,
              code: 'cost_limit_exceeded',
            },
          },
          { status: 403 }
        )
      }
    }

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
    const attribution = resolveAttribution(request, authResult.defaults)

    // Convert input to messages format (for chat/completions)
    const messages = Array.isArray(input)
      ? input.map((msg) => (typeof msg === 'string' ? { role: 'user', content: msg } : msg))
      : [{ role: 'user', content: input }]

    // Handle streaming
    if (stream === true) {
      const { createStreamingResponse } = await import('../chat/completions-stream')
      const streamResponse = await createStreamingResponse(
        authResult.orgId,
        authResult.createdByUserId,
        model,
        messages,
        undefined,
        undefined,
        attribution.teamId || request.headers.get('x-pulse-team') || undefined,
        attribution.projectId,
        attribution.appId,
        attribution.clientId,
        authResult.apiKeyId,
        authResult.apiKeyLabel
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
      orgId: authResult.orgId,
      userId: authResult.createdByUserId,
      teamId: attribution.teamId || request.headers.get('x-pulse-team') || undefined,
      projectId: attribution.projectId,
      appId: attribution.appId,
      clientId: attribution.clientId,
      apiKeyId: authResult.apiKeyId,
      apiKeyLabel: authResult.apiKeyLabel,
      model,
      messages,
      metadata: {
        source: 'openai-compat-v1-responses',
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

