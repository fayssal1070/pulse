/**
 * OpenAI provider implementation
 */

export interface ProviderRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  maxTokens?: number
  temperature?: number
}

export interface ProviderResponse {
  text: string
  tokensIn: number
  tokensOut: number
  latencyMs: number
  provider: string
  model: string
  raw?: any
}

export async function callOpenAI(
  apiKey: string,
  request: ProviderRequest
): Promise<ProviderResponse> {
  const startTime = Date.now()

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  return {
    text: data.choices[0]?.message?.content || '',
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0,
    latencyMs,
    provider: 'openai',
    model: request.model,
    raw: data,
  }
}

