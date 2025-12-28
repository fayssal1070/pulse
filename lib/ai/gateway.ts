/**
 * AI Gateway - Proxy requests to AI providers with policy enforcement
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { checkPolicies, type RequestContext } from './policy'
import { estimateCost, getProviderFromModel } from './pricing'
import type { CostEventDimensions } from '@/lib/cost-events/types'

export interface AiRequestInput {
  orgId: string
  userId?: string
  teamId?: string
  projectId?: string
  appId?: string
  clientId?: string
  model: string
  messages?: Array<{ role: string; content: string }>
  prompt?: string
  maxTokens?: number
  temperature?: number
  metadata?: Record<string, any>
}

export interface AiRequestResponse {
  success: boolean
  content?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  estimatedCostEur?: number
  requestId?: string
  error?: string
}

/**
 * Hash prompt for privacy (SHA-256)
 */
function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex')
}

/**
 * Make request to OpenAI-compatible API
 */
async function callOpenAI(
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens?: number,
  temperature?: number
): Promise<{
  content: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  requestId: string
}> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: temperature ?? 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    content: data.choices[0]?.message?.content || '',
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0,
    requestId: data.id || '',
  }
}

/**
 * Process AI request through gateway
 */
export async function processAiRequest(
  input: AiRequestInput
): Promise<AiRequestResponse> {
  const startTime = Date.now()

  try {
    // Build messages from input
    const messages: Array<{ role: string; content: string }> = []

    if (input.messages) {
      messages.push(...input.messages)
    } else if (input.prompt) {
      messages.push({ role: 'user', content: input.prompt })
    } else {
      throw new Error('Either messages or prompt must be provided')
    }

    // Estimate tokens (rough: 1 token ≈ 4 chars)
    const estimatedInputTokens = Math.ceil(
      messages.reduce((sum, m) => sum + m.content.length, 0) / 4
    )
    const estimatedOutputTokens = input.maxTokens || 1000

    // Estimate cost
    const estimatedCost = estimateCost(input.model, estimatedInputTokens, estimatedOutputTokens)

    // Check policies BEFORE making request
    const policyContext: RequestContext = {
      orgId: input.orgId,
      userId: input.userId,
      teamId: input.teamId,
      projectId: input.projectId,
      appId: input.appId,
      clientId: input.clientId,
      model: input.model,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      estimatedCost,
    }

    const policyCheck = await checkPolicies(policyContext)
    if (!policyCheck.allowed) {
      // Log blocked request
      await prisma.aiRequestLog.create({
        data: {
          orgId: input.orgId,
          userId: input.userId,
          teamId: input.teamId,
          projectId: input.projectId,
          appId: input.appId,
          clientId: input.clientId,
          provider: getProviderFromModel(input.model),
          model: input.model,
          promptHash: hashPrompt(messages.map((m) => m.content).join('\n')),
          statusCode: 403,
          estimatedCostEur: estimatedCost,
          rawRef: {
            blocked: true,
            reason: policyCheck.reason,
            policyId: policyCheck.policyId,
          },
        },
      })

      return {
        success: false,
        error: policyCheck.reason || 'Request blocked by policy',
      }
    }

    // Make actual API call
    const provider = getProviderFromModel(input.model)
    let apiResponse: {
      content: string
      inputTokens: number
      outputTokens: number
      totalTokens: number
      requestId: string
    }

    if (provider === 'openai') {
      apiResponse = await callOpenAI(
        input.model,
        messages,
        input.maxTokens,
        input.temperature
      )
    } else {
      // For other providers, we'd implement similar functions
      // For MVP, we'll support OpenAI only
      throw new Error(`Provider ${provider} not yet supported`)
    }

    const latencyMs = Date.now() - startTime
    const finalCost = estimateCost(
      input.model,
      apiResponse.inputTokens,
      apiResponse.outputTokens
    )

    // Create AiRequestLog
    const requestLog = await prisma.aiRequestLog.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        teamId: input.teamId,
        projectId: input.projectId,
        appId: input.appId,
        clientId: input.clientId,
        provider,
        model: input.model,
        promptHash: hashPrompt(messages.map((m) => m.content).join('\n')),
        inputTokens: apiResponse.inputTokens,
        outputTokens: apiResponse.outputTokens,
        totalTokens: apiResponse.totalTokens,
        estimatedCostEur: finalCost,
        latencyMs,
        statusCode: 200,
        rawRef: {
          requestId: apiResponse.requestId,
          provider: provider,
        },
      },
    })

    // Create CostEvent
    const dimensions: CostEventDimensions = {}
    if (input.userId) dimensions.userId = input.userId
    if (input.teamId) dimensions.teamId = input.teamId
    if (input.projectId) dimensions.projectId = input.projectId
    if (input.appId) dimensions.appId = input.appId
    if (input.clientId) dimensions.clientId = input.clientId
    dimensions.model = input.model

    const uniqueHash = createHash('sha256')
      .update(
        `${input.orgId}|${apiResponse.requestId}|${requestLog.id}|${apiResponse.totalTokens}|${finalCost}`
      )
      .digest('hex')

    await prisma.costEvent.create({
      data: {
        orgId: input.orgId,
        source: 'AI',
        occurredAt: new Date(),
        amountEur: finalCost,
        currency: 'EUR',
        provider,
        resourceType: 'LLM_CALL',
        service: provider === 'openai' ? 'OpenAI' : provider,
        usageType: 'tokens',
        quantity: apiResponse.totalTokens,
        unit: 'TOKENS',
        costCategory: 'AI',
        dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined,
        uniqueHash,
        ingestionBatchId: null,
      },
    })

    return {
      success: true,
      content: apiResponse.content,
      model: input.model,
      inputTokens: apiResponse.inputTokens,
      outputTokens: apiResponse.outputTokens,
      totalTokens: apiResponse.totalTokens,
      estimatedCostEur: finalCost,
      requestId: apiResponse.requestId,
    }
  } catch (error: any) {
    const latencyMs = Date.now() - startTime

    // Log error
    await prisma.aiRequestLog.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        teamId: input.teamId,
        projectId: input.projectId,
        appId: input.appId,
        clientId: input.clientId,
        provider: getProviderFromModel(input.model),
        model: input.model,
        promptHash: hashPrompt(
          input.messages?.map((m) => m.content).join('\n') || input.prompt || ''
        ),
        statusCode: 500,
        estimatedCostEur: 0,
        rawRef: {
          error: error.message,
        },
      },
    })

    return {
      success: false,
      error: error.message || 'AI request failed',
    }
  }
}

