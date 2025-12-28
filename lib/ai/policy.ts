/**
 * AI Policy enforcement
 */

import { prisma } from '@/lib/prisma'
import { estimateCost } from './pricing'

export interface PolicyCheckResult {
  allowed: boolean
  reason?: string
  policyId?: string
}

export interface RequestContext {
  orgId: string
  userId?: string
  teamId?: string
  projectId?: string
  appId?: string
  clientId?: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}

/**
 * Check if model is allowed by policy
 */
export async function checkModelAllowed(
  orgId: string,
  model: string
): Promise<PolicyCheckResult> {
  const policies = await prisma.aiPolicy.findMany({
    where: {
      orgId,
      enabled: true,
    },
  })

  if (policies.length === 0) {
    // No policies = allow all (for MVP)
    return { allowed: true }
  }

  // Check if model is explicitly blocked
  for (const policy of policies) {
    const blockedModels = (policy.blockedModels as string[]) || []
    for (const blocked of blockedModels) {
      if (model.includes(blocked) || blocked.includes(model)) {
        return {
          allowed: false,
          reason: `Model ${model} is blocked by policy "${policy.name}"`,
          policyId: policy.id,
        }
      }
    }
  }

  // Check if model is explicitly allowed (if allowlist exists)
  for (const policy of policies) {
    const allowedModels = (policy.allowedModels as string[]) || []
    if (allowedModels.length > 0) {
      // If allowlist exists, model must be in it
      const isAllowed = allowedModels.some(
        (allowed) => model.includes(allowed) || allowed.includes(model)
      )
      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Model ${model} is not in allowed list for policy "${policy.name}"`,
          policyId: policy.id,
        }
      }
    }
  }

  return { allowed: true }
}

/**
 * Check cost limits (daily/monthly)
 */
export async function checkCostLimits(
  context: RequestContext
): Promise<PolicyCheckResult> {
  const policies = await prisma.aiPolicy.findMany({
    where: {
      orgId: context.orgId,
      enabled: true,
    },
  })

  for (const policy of policies) {
    if (policy.maxCostPerDayEur) {
      // Check daily cost for org
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const todayCost = await prisma.costEvent.aggregate({
        where: {
          orgId: context.orgId,
          source: 'AI',
          occurredAt: { gte: todayStart },
        },
        _sum: { amountEur: true },
      })

      const totalToday = Number(todayCost._sum.amountEur || 0)
      const projectedToday = totalToday + context.estimatedCost

      if (projectedToday > Number(policy.maxCostPerDayEur)) {
        return {
          allowed: false,
          reason: `Daily cost limit exceeded: ${projectedToday.toFixed(2)} EUR > ${Number(policy.maxCostPerDayEur).toFixed(2)} EUR`,
          policyId: policy.id,
        }
      }
    }
  }

  return { allowed: true }
}

/**
 * Check token limits per request
 */
export async function checkTokenLimits(
  orgId: string,
  totalTokens: number
): Promise<PolicyCheckResult> {
  const policies = await prisma.aiPolicy.findMany({
    where: {
      orgId,
      enabled: true,
    },
  })

  for (const policy of policies) {
    if (policy.maxTokensPerReq && totalTokens > policy.maxTokensPerReq) {
      return {
        allowed: false,
        reason: `Token limit exceeded: ${totalTokens} > ${policy.maxTokensPerReq}`,
        policyId: policy.id,
      }
    }
  }

  return { allowed: true }
}

/**
 * Comprehensive policy check
 */
export async function checkPolicies(
  context: RequestContext
): Promise<PolicyCheckResult> {
  // Check model allow/block
  const modelCheck = await checkModelAllowed(context.orgId, context.model)
  if (!modelCheck.allowed) {
    return modelCheck
  }

  // Check token limits
  const tokenCheck = await checkTokenLimits(
    context.orgId,
    context.inputTokens + context.outputTokens
  )
  if (!tokenCheck.allowed) {
    return tokenCheck
  }

  // Check cost limits
  const costCheck = await checkCostLimits(context)
  if (!costCheck.allowed) {
    return costCheck
  }

  return { allowed: true }
}

