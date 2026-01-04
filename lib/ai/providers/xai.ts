/**
 * xAI provider implementation (OpenAI-compatible API)
 */

import type { ProviderRequest, ProviderResponse } from './openai'

export async function callXAI(
  apiKey: string,
  request: ProviderRequest
): Promise<ProviderResponse> {
  const startTime = Date.now()

  // xAI uses OpenAI-compatible API at api.x.ai
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `xAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  return {
    text: data.choices[0]?.message?.content || '',
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0,
    latencyMs,
    provider: 'xai',
    model: request.model,
    raw: data,
  }
}

