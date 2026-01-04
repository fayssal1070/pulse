/**
 * AI Provider Router
 * Finds the appropriate provider and route for a given model
 */

import { prisma } from '@/lib/prisma'
import { AiProvider, AiProviderConnectionStatus } from '@prisma/client'
import { decryptSecret } from './crypto'
import { callOpenAI } from './openai'
import { callAnthropic } from './anthropic'
import { callXAI } from './xai'
import { callGoogle } from './google'
import { callMistral } from './mistral'

export interface RouterRequest {
  orgId: string
  model: string
  messages: Array<{ role: string; content: string }>
  maxTokens?: number
  temperature?: number
}

export interface RouterResponse {
  text: string
  tokensIn: number
  tokensOut: number
  latencyMs: number
  provider: AiProvider
  model: string
  raw?: any
}

/**
 * Route AI request to appropriate provider
 */
export async function routeAiRequest(request: RouterRequest): Promise<RouterResponse> {
  // Find active model route for this model (org-scoped)
  const routes = await prisma.aiModelRoute.findMany({
    where: {
      orgId: request.orgId,
      model: request.model,
      enabled: true,
    },
    orderBy: {
      priority: 'asc', // Lower priority = higher precedence
    },
    take: 1,
  })

  if (routes.length === 0) {
    throw new Error(
      `No provider connected for model ${request.model}. Go to /admin/integrations/ai to configure providers.`
    )
  }

  const route = routes[0]

  // Find active provider connection for this provider (org-scoped)
  const connection = await prisma.aiProviderConnection.findFirst({
    where: {
      orgId: request.orgId,
      provider: route.provider,
      status: AiProviderConnectionStatus.ACTIVE,
    },
  })

  if (!connection) {
    throw new Error(
      `No active connection found for provider ${route.provider}. Go to /admin/integrations/ai to configure.`
    )
  }

  // Decrypt API key
  const apiKey = decryptSecret(connection.encryptedApiKey)

  // Check maxCostPerReqEUR if set
  if (route.maxCostPerReqEUR !== null && route.maxCostPerReqEUR !== undefined) {
    // We'd need to estimate cost here, but for now we'll proceed
    // The gateway will check budgets/policies after the call
  }

  // Call appropriate provider
  const providerRequest = {
    model: request.model,
    messages: request.messages,
    maxTokens: request.maxTokens,
    temperature: request.temperature,
  }

  let providerResponse: {
    text: string
    tokensIn: number
    tokensOut: number
    latencyMs: number
    provider: string
    model: string
    raw?: any
  }

  switch (route.provider) {
    case AiProvider.OPENAI:
      providerResponse = await callOpenAI(apiKey, providerRequest)
      break
    case AiProvider.ANTHROPIC:
      providerResponse = await callAnthropic(apiKey, providerRequest)
      break
    case AiProvider.XAI:
      providerResponse = await callXAI(apiKey, providerRequest)
      break
    case AiProvider.GOOGLE:
      providerResponse = await callGoogle(apiKey, providerRequest)
      break
    case AiProvider.MISTRAL:
      providerResponse = await callMistral(apiKey, providerRequest)
      break
    default:
      throw new Error(`Unsupported provider: ${route.provider}`)
  }

  return {
    text: providerResponse.text,
    tokensIn: providerResponse.tokensIn,
    tokensOut: providerResponse.tokensOut,
    latencyMs: providerResponse.latencyMs,
    provider: route.provider,
    model: providerResponse.model,
    raw: providerResponse.raw,
  }
}

