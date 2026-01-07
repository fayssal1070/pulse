/**
 * AI Gateway - Proxy requests to AI providers with policy enforcement
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { isOverQuota } from '@/lib/billing/overage'
import { checkPolicies, type RequestContext } from './policy'
import { estimateCost, getProviderFromModel } from './pricing'
import { computeBudgetStatus } from '@/lib/alerts/engine'
import type { CostEventDimensions } from '@/lib/cost-events/types'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'

export interface AiRequestInput {
  orgId: string
  userId?: string
  teamId?: string
  projectId?: string
  appId?: string
  clientId?: string
  apiKeyId?: string
  apiKeyLabel?: string | null
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
  blockedBy?: string
  budgetId?: string
}

/**
 * Hash prompt for privacy (SHA-256)
 */
function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex')
}

/**
 * Check budget enforcement for AI requests
 * Priority: APP -> PROJECT -> CLIENT -> TEAM -> ORG (most specific first)
 */
async function checkBudgetEnforcement(
  orgId: string,
  teamId?: string,
  projectId?: string,
  appId?: string,
  clientId?: string,
  estimatedCost: number = 0
): Promise<{ allowed: boolean; reason?: string; budgetId?: string; scopeType?: string }> {
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

    // Check budgets in priority order: APP -> PROJECT -> CLIENT -> TEAM -> ORG
    const priorityOrder = [
      { type: 'APP' as const, id: appId },
      { type: 'PROJECT' as const, id: projectId },
      { type: 'CLIENT' as const, id: clientId },
      { type: 'TEAM' as const, id: teamId },
      { type: 'ORG' as const, id: null },
    ]

    for (const priority of priorityOrder) {
      if (priority.type === 'ORG' || priority.id) {
        // Find matching budget for this scope
        const budget = budgets.find((b) => {
          if (b.scopeType === 'ORG') {
            return priority.type === 'ORG'
          }
          return b.scopeType === priority.type && b.scopeId === priority.id
        })

        if (!budget) continue

        // Compute budget status
        const budgetStatus = await computeBudgetStatus(orgId, budget.id)
        if (!budgetStatus) continue

        // Type guard for status
        const statusValue = budgetStatus.status

        // If critical and hardLimit=true, deny request
        if (statusValue === 'CRITICAL') {
          return {
            allowed: false,
            reason: `Budget "${budget.name}" exceeded (${budgetStatus.percentage.toFixed(1)}%). Request blocked.`,
            budgetId: budget.id,
            scopeType: budget.scopeType,
          }
        }

        // If warning and projected cost would exceed with hardLimit, block
        if (statusValue === 'WARNING') {
          const projectedSpend = budgetStatus.currentSpend + estimatedCost
          const projectedPercentage = (projectedSpend / budgetStatus.limit) * 100

          if (projectedPercentage >= 100) {
            return {
              allowed: false,
              reason: `Budget "${budget.name}" would be exceeded (${projectedPercentage.toFixed(1)}%). Request blocked.`,
              budgetId: budget.id,
              scopeType: budget.scopeType,
            }
          }
        }

        // If we found a matching budget, stop checking (most specific wins)
        break
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
 * Route AI request through provider router
 * Falls back to OPENAI_API_KEY env var if no provider configured (backward compatibility)
 */
async function routeProviderRequest(
  orgId: string,
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
  provider: string
}> {
  // Simulation mode (dev only)
  const simulate = process.env.PULSE_SIMULATE_AI === 'true'
  if (simulate) {
    const inputTokens = Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4)
    const outputTokens = maxTokens ? Math.floor(maxTokens * 0.7) : 500
    return {
      content: '[SIMULATED] This is a simulated AI response. Set PULSE_SIMULATE_AI=false to use real API.',
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      requestId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: 'simulated',
    }
  }

  try {
    // Try to use router (if providers are configured)
    const { routeAiRequest } = await import('./providers/router')
    const result = await routeAiRequest({
      orgId,
      model,
      messages,
      maxTokens,
      temperature,
    })

    return {
      content: result.text,
      inputTokens: result.tokensIn,
      outputTokens: result.tokensOut,
      totalTokens: result.tokensIn + result.tokensOut,
      requestId: result.raw?.id || `req_${Date.now()}`,
      provider: result.provider,
    }
  } catch (routerError: any) {
    // If router fails with "No provider connected", fall back to OPENAI_API_KEY for backward compatibility
    if (routerError.message?.includes('No provider connected')) {
      // Fallback to legacy OPENAI_API_KEY (backward compatibility)
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error(
          `No provider connected for model ${model}. Go to /admin/integrations/ai to configure providers.`
        )
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
        provider: 'openai',
      }
    }

    // Re-throw other router errors
    throw routerError
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
    const budgetCheck = await checkBudgetEnforcement(
      input.orgId,
      input.teamId,
      input.projectId,
      input.appId,
      input.clientId,
      estimatedCost
    )
    if (!budgetCheck.allowed) {
      // Log blocked request with scope info
      await prisma.aiRequestLog.create({
        data: {
          orgId: input.orgId,
          userId: input.userId,
          teamId: input.teamId,
          projectId: input.projectId,
          appId: input.appId,
          clientId: input.clientId,
          apiKeyId: input.apiKeyId || null,
          apiKeyLabelSnapshot: input.apiKeyLabel || null,
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
            reason: budgetCheck.scopeType ? `budget_blocked_${budgetCheck.scopeType.toLowerCase()}` : 'budget_blocked',
            budgetId: budgetCheck.budgetId,
            scopeType: budgetCheck.scopeType,
            blocked: true,
          },
        },
      })

      return {
        success: false,
        error: budgetCheck.reason || 'Budget exceeded. Request blocked.',
        // Include scope info in error response
        blockedBy: budgetCheck.scopeType ? `budget_blocked_${budgetCheck.scopeType.toLowerCase()}` : 'budget_blocked',
        budgetId: budgetCheck.budgetId,
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
          apiKeyId: input.apiKeyId || null,
          apiKeyLabelSnapshot: input.apiKeyLabel || null,
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

    // Make actual API call through router
    const apiResponse = await routeProviderRequest(
      input.orgId,
      input.model,
      messages,
      input.maxTokens,
      input.temperature
    )

    // Get provider from response (router returns the actual provider used)
    const provider = apiResponse.provider || getProviderFromModel(input.model)

    const latencyMs = Date.now() - startTime
    const finalCost = estimateCost(
      input.model,
      apiResponse.inputTokens,
      apiResponse.outputTokens
    )

    // PR30: Check if over quota (log but don't block)
    const quotaCheck = await isOverQuota(input.orgId).catch(() => ({
      isOver: false,
      current: 0,
      included: 0,
      percentage: 0,
    }))

    // Create AiRequestLog
    const requestLog = await prisma.aiRequestLog.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        teamId: input.teamId,
        projectId: input.projectId,
        appId: input.appId,
        clientId: input.clientId,
        apiKeyId: input.apiKeyId || null,
        apiKeyLabelSnapshot: input.apiKeyLabel || null,
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
          overQuota: quotaCheck.isOver,
          quotaPercentage: quotaCheck.percentage,
        },
      },
    })

    // Create CostEvent with direct dimension columns
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

    const costEvent = await prisma.costEvent.create({
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
        // Direct dimension columns for efficient querying
        teamId: input.teamId || null,
        projectId: input.projectId || null,
        appId: input.appId || null,
        clientId: input.clientId || null,
        apiKeyId: input.apiKeyId || null,
        apiKeyLabelSnapshot: input.apiKeyLabel || null,
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

    // Dispatch webhooks (fail-soft, async)
    dispatchWebhook(input.orgId, 'cost_event.created', {
      costEventId: costEvent.id,
      amountEur: finalCost,
      provider,
      model: input.model,
      tokens: apiResponse.totalTokens,
    }).catch(() => {
      // Fail-soft: already handled in dispatchWebhook
    })

    dispatchWebhook(input.orgId, 'ai_request.completed', {
      requestLogId: requestLog.id,
      provider,
      model: input.model,
      tokensIn: apiResponse.inputTokens,
      tokensOut: apiResponse.outputTokens,
      costEur: finalCost,
      latencyMs,
    }).catch(() => {
      // Fail-soft: already handled in dispatchWebhook
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
        apiKeyId: input.apiKeyId || null,
        apiKeyLabelSnapshot: input.apiKeyLabel || null,
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
    let userError = sanitizedError
    if (errorMessage.includes('No provider connected') || errorMessage.includes('OPENAI_API_KEY')) {
      userError = errorMessage.includes('No provider connected')
        ? sanitizedError // Router already provides clear message
        : 'AI Gateway is not configured. Please contact your administrator.'
    }

    return {
      success: false,
      error: userError,
    }
  }
}

