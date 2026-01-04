/**
 * Anthropic provider implementation
 */

import type { ProviderRequest, ProviderResponse } from './openai'

export async function callAnthropic(
  apiKey: string,
  request: ProviderRequest
): Promise<ProviderResponse> {
  const startTime = Date.now()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens || 1024,
      messages: request.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      temperature: request.temperature ?? 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `Anthropic API error: ${response.statusText}`)
  }

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  return {
    text: data.content[0]?.text || '',
    tokensIn: data.usage?.input_tokens || 0,
    tokensOut: data.usage?.output_tokens || 0,
    latencyMs,
    provider: 'anthropic',
    model: request.model,
    raw: data,
  }
}

