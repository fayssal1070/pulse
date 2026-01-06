/**
 * OpenAI-compatible embeddings endpoint
 * POST /api/v1/embeddings
 * Note: This is a placeholder - embeddings would require provider-specific implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireApiKeyAuth, checkModelRestrictions, checkCostLimits } from '@/lib/ai/api-key-auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { callOpenAIEmbeddings } from '@/lib/ai/providers/openai-streaming'
import { decryptSecret } from '@/lib/ai/providers/crypto'
import { prisma } from '@/lib/prisma'
import { AiProvider, AiProviderConnectionStatus } from '@prisma/client'
import { estimateCost } from '@/lib/ai/pricing'
import { createHash } from 'crypto'

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
              param: null,
              code: 'rate_limit_exceeded',
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': authResult.limits.rateLimitRpm.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
            },
          }
        )
      }
    }

    // Parse OpenAI request body
    const body = await request.json().catch(() => ({}))
    const { input, model = 'text-embedding-ada-002' } = body

    // Check model restrictions
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

    // Find route and connection for embeddings
    const routes = await prisma.aiModelRoute.findMany({
      where: {
        orgId: authResult.orgId,
        model,
        enabled: true,
      },
      orderBy: { priority: 'asc' },
      take: 1,
    })

    if (routes.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: `No provider connected for model ${model}`,
            type: 'invalid_request_error',
            param: 'model',
            code: 'model_not_found',
          },
        },
        { status: 400 }
      )
    }

    const route = routes[0]

    // Check if provider supports embeddings (currently only OpenAI)
    if (route.provider !== AiProvider.OPENAI) {
      return NextResponse.json(
        {
          error: {
            message: `Embeddings not supported for provider ${route.provider}. Configure a provider route that supports embeddings (e.g., OpenAI).`,
            type: 'invalid_request_error',
            param: 'model',
            code: 'provider_not_supported',
          },
        },
        { status: 400 }
      )
    }

    const connection = await prisma.aiProviderConnection.findFirst({
      where: {
        orgId: authResult.orgId,
        provider: route.provider,
        status: AiProviderConnectionStatus.ACTIVE,
      },
    })

    if (!connection) {
      return NextResponse.json(
        {
          error: {
            message: `No active connection for provider ${route.provider}`,
            type: 'invalid_request_error',
            code: 'provider_not_configured',
          },
        },
        { status: 400 }
      )
    }

    const apiKey = decryptSecret(connection.encryptedApiKey)
    const inputs = Array.isArray(input) ? input : [input]

    // Call OpenAI embeddings API
    const embeddingsResult = await callOpenAIEmbeddings(apiKey, inputs, model)

    // Estimate cost and log (simplified - embeddings cost is usually very low)
    const estimatedCost = estimateCost(model, embeddingsResult.tokensIn, 0)
    const requestId = `emb_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Log request (async, don't block)
    prisma.aiRequestLog
      .create({
        data: {
          orgId: authResult.orgId,
          userId: authResult.createdByUserId,
          apiKeyId: authResult.apiKeyId,
          apiKeyLabelSnapshot: authResult.apiKeyLabel,
          provider: 'openai',
          model,
          promptHash: createHash('sha256')
            .update(inputs.join('\n'))
            .digest('hex'),
          inputTokens: embeddingsResult.tokensIn,
          outputTokens: 0,
          totalTokens: embeddingsResult.tokensIn,
          estimatedCostEur: estimatedCost,
          statusCode: 200,
          rawRef: { requestId, type: 'embeddings' },
        },
      })
      .catch((err) => console.error('Embeddings log error:', err))

    // Create cost event (async)
    prisma.costEvent
      .create({
        data: {
          orgId: authResult.orgId,
          source: 'AI',
          occurredAt: new Date(),
          amountEur: estimatedCost,
          currency: 'EUR',
          provider: 'openai',
          resourceType: 'EMBEDDINGS',
          service: 'OpenAI',
          usageType: 'tokens',
          quantity: embeddingsResult.tokensIn,
          unit: 'TOKENS',
          costCategory: 'AI',
          apiKeyId: authResult.apiKeyId,
          apiKeyLabelSnapshot: authResult.apiKeyLabel,
          uniqueHash: createHash('sha256')
            .update(`${authResult.orgId}|${requestId}|${embeddingsResult.tokensIn}`)
            .digest('hex'),
          rawRef: { requestId, type: 'embeddings' },
        },
      })
      .catch((err) => console.error('Embeddings cost event error:', err))

    const response = {
      object: 'list',
      data: embeddingsResult.embeddings.map((embedding, index) => ({
        object: 'embedding',
        embedding,
        index,
      })),
      model: embeddingsResult.model,
      usage: {
        prompt_tokens: embeddingsResult.tokensIn,
        total_tokens: embeddingsResult.tokensIn,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Embeddings error:', error)
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

