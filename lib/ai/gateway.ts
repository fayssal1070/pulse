/**
 * AI Gateway - Proxy requests to AI providers with policy enforcement
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { checkPolicies, type RequestContext } from './policy'
import { estimateCost, getProviderFromModel } from './pricing'
import { computeBudgetStatus } from '@/lib/alerts/engine'
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
 * Check budget enforcement for AI requests
 */
async function checkBudgetEnforcement(
  orgId: string,
  teamId?: string,
  projectId?: string,
  estimatedCost: number = 0
): Promise<{ allowed: boolean; reason?: string; budgetId?: string }> {
  try {
    // Get all enabled budgets with hardLimit=true
    const budgets = await prisma.budget.findMany({
      where: {
        orgId,
        enabled: true,
        hardLimit: true,
      },
      select: {
        id: true,
        name: true,
        scopeType: true,
        scopeId: true,
        period: true,
        actions: true,
      },
    })

    for (const budget of budgets) {
      // Check if this budget applies to this request
      let applies = false

      if (budget.scopeType === 'ORG') {
        applies = true
      } else if (budget.scopeType === 'TEAM' && budget.scopeId === teamId) {
        applies = true
      } else if (budget.scopeType === 'PROJECT' && budget.scopeId === projectId) {
        applies = true
      }

      if (!applies) continue

      // Compute budget status
      const status = await computeBudgetStatus(orgId, budget.id)
      if (!status) continue

      // If critical and action is block, deny request
      if (status.status === 'CRITICAL') {
        const actions = budget.actions as any
        if (actions?.block === true) {
          return {
            allowed: false,
            reason: `Budget "${budget.name}" exceeded (${status.percentage.toFixed(1)}%). Request blocked.`,
            budgetId: budget.id,
          }
        }
      }

      // If warning and projected cost would exceed, check restrict action
      if (status.status === 'WARNING' || status.status === 'CRITICAL') {
        const projectedSpend = status.currentSpend + estimatedCost
        const projectedPercentage = (projectedSpend / status.limit) * 100

        if (projectedPercentage >= 100) {
          const actions = budget.actions as any
          if (actions?.block === true) {
            return {
              allowed: false,
              reason: `Budget "${budget.name}" would be exceeded (${projectedPercentage.toFixed(1)}%). Request blocked.`,
              budgetId: budget.id,
            }
          }
        }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking budget enforcement:', error)
    // On error, allow request (fail open for MVP)
    return { allowed: true }
  }
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
    throw new Error('OPENAI_API_KEY environment variable is not configured. Please set it in Vercel environment variables.')
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

    // Check budget enforcement BEFORE policies
    const budgetCheck = await checkBudgetEnforcement(input.orgId, input.teamId, input.projectId, estimatedCost)
    if (!budgetCheck.allowed) {
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
          inputTokens: estimatedInputTokens,
          outputTokens: 0,
          totalTokens: estimatedInputTokens,
          estimatedCostEur: estimatedCost,
          latencyMs: Date.now() - startTime,
          statusCode: 403,
          rawRef: {
            reason: 'budget_blocked',
            budgetId: budgetCheck.budgetId,
          },
        },
      })

      return {
        success: false,
        error: budgetCheck.reason || 'Budget exceeded. Request blocked.',
      }
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
        rawRef: {
          requestId: apiResponse.requestId,
          inputTokens: apiResponse.inputTokens,
          outputTokens: apiResponse.outputTokens,
          totalTokens: apiResponse.totalTokens,
        },
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

    // Log error (never log API keys or sensitive data)
    const errorMessage = error.message || 'AI request failed'
    // Sanitize error message to avoid leaking API keys
    const sanitizedError = errorMessage
      .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]')
      .replace(/OPENAI_API_KEY/g, '[API_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9]+/g, 'Bearer [REDACTED]')

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
        statusCode: errorMessage.includes('OPENAI_API_KEY') ? 503 : 500,
        estimatedCostEur: 0,
        rawRef: {
          error: sanitizedError,
        },
      },
    })

    // Return user-friendly error (never expose API keys)
    const userError = errorMessage.includes('OPENAI_API_KEY')
      ? 'AI Gateway is not configured. Please contact your administrator.'
      : sanitizedError

    return {
      success: false,
      error: userError,
    }
  }
}

