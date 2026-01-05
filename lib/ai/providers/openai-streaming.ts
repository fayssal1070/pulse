/**
 * OpenAI provider streaming implementation
 */

export interface StreamingProviderRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  maxTokens?: number
  temperature?: number
}

export interface StreamingChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string }
    finish_reason: string | null
  }>
}

/**
 * Stream OpenAI chat completion
 * Returns an async generator of SSE chunks
 */
export async function* streamOpenAI(
  apiKey: string,
  request: StreamingProviderRequest
): AsyncGenerator<string, void, unknown> {
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
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  try {
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') {
          yield `data: [DONE]\n\n`
          continue
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6)
          try {
            const chunk: StreamingChunk = JSON.parse(jsonStr)
            yield `data: ${JSON.stringify({
              id: chunk.id,
              object: 'chat.completion.chunk',
              created: chunk.created,
              model: chunk.model,
              choices: chunk.choices.map((c) => ({
                index: c.index,
                delta: c.delta,
                finish_reason: c.finish_reason,
              })),
            })}\n\n`
          } catch (e) {
            // Skip invalid JSON
            continue
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Call OpenAI embeddings API
 */
export async function callOpenAIEmbeddings(
  apiKey: string,
  input: string | string[],
  model: string = 'text-embedding-ada-002'
): Promise<{
  embeddings: number[][]
  tokensIn: number
  model: string
  raw?: any
}> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: Array.isArray(input) ? input : [input],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    embeddings: data.data.map((item: any) => item.embedding),
    tokensIn: data.usage?.total_tokens || 0,
    model: data.model || model,
    raw: data,
  }
}

