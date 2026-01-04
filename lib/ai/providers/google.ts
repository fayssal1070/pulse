/**
 * Google (Gemini) provider implementation
 */

import type { ProviderRequest, ProviderResponse } from './openai'

export async function callGoogle(
  apiKey: string,
  request: ProviderRequest
): Promise<ProviderResponse> {
  const startTime = Date.now()

  // Google Gemini API
  const modelName = request.model.replace('google-', '').replace('gemini-', '') || 'gemini-pro'
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: request.messages.map((m) => ({
          parts: [{ text: m.content }],
          role: m.role === 'user' ? 'user' : 'model',
        })),
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature ?? 0.7,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `Google API error: ${response.statusText}`)
  }

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  // Extract text from Gemini response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  // Gemini doesn't always return token usage, estimate roughly
  const inputTokens = Math.ceil(request.messages.reduce((sum, m) => sum + m.content.length, 0) / 4)
  const outputTokens = Math.ceil(text.length / 4)

  return {
    text,
    tokensIn: data.usageMetadata?.promptTokenCount || inputTokens,
    tokensOut: data.usageMetadata?.candidatesTokenCount || outputTokens,
    latencyMs,
    provider: 'google',
    model: request.model,
    raw: data,
  }
}

