/**
 * Streaming helper for chat completions
 */

import { streamOpenAI } from '@/lib/ai/providers/openai-streaming'
import { decryptSecret } from '@/lib/ai/providers/crypto'
import { prisma } from '@/lib/prisma'
import { AiProvider, AiProviderConnectionStatus } from '@prisma/client'
import { processAiRequest } from '@/lib/ai/gateway'

export async function createStreamingResponse(
  orgId: string,
  userId: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens?: number,
  temperature?: number,
  teamId?: string,
  projectId?: string,
  appId?: string,
  clientId?: string,
  apiKeyId?: string,
  apiKeyLabel?: string | null
): Promise<ReadableStream> {
  // Find route and connection (same logic as router)
  const routes = await prisma.aiModelRoute.findMany({
    where: {
      orgId,
      model,
      enabled: true,
    },
    orderBy: { priority: 'asc' },
    take: 1,
  })

  if (routes.length === 0) {
    throw new Error(`No provider connected for model ${model}`)
  }

  const route = routes[0]
  const connection = await prisma.aiProviderConnection.findFirst({
    where: {
      orgId,
      provider: route.provider,
      status: AiProviderConnectionStatus.ACTIVE,
    },
  })

  if (!connection) {
    throw new Error(`No active connection for provider ${route.provider}`)
  }

  const apiKey = decryptSecret(connection.encryptedApiKey)

  const encoder = new TextEncoder()
  const requestId = `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(7)}`
  let fullText = ''
  let inputTokens = 0
  let outputTokens = 0

  // For now, only OpenAI supports streaming
  if (route.provider !== AiProvider.OPENAI) {
    // Fallback: call non-streaming API and stream as single chunk
    const gatewayResponse = await processAiRequest({
      orgId,
      userId,
      teamId,
      projectId,
      appId,
      clientId,
      apiKeyId,
      apiKeyLabel,
      model,
      messages,
      maxTokens,
      temperature,
      metadata: { source: 'openai-compat-v1-stream-fallback' },
    })

    if (!gatewayResponse.success) {
      throw new Error(gatewayResponse.error || 'Request failed')
    }

    return new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              id: requestId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: gatewayResponse.model || model,
              choices: [
                {
                  index: 0,
                  delta: { content: gatewayResponse.content || '' },
                  finish_reason: 'stop',
                },
              ],
            })}\n\n`
          )
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
  }

  // Create stream generator for OpenAI
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamOpenAI(apiKey, {
          model,
          messages,
          maxTokens,
          temperature,
        })) {
          controller.enqueue(encoder.encode(chunk))

          // Parse chunk to accumulate tokens (simplified)
          if (chunk.includes('"delta"')) {
            try {
              const jsonStr = chunk.replace('data: ', '').trim()
              if (jsonStr && jsonStr !== '[DONE]') {
                const data = JSON.parse(jsonStr)
                if (data.choices?.[0]?.delta?.content) {
                  fullText += data.choices[0].delta.content
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        controller.close()

        // Log request after streaming completes (async, don't block)
        processAiRequest({
          orgId,
          userId,
          teamId,
          projectId,
          appId,
          clientId,
          apiKeyId,
          apiKeyLabel,
          model,
          messages,
          maxTokens,
          temperature,
          metadata: { source: 'openai-compat-v1-stream', requestId },
        }).catch((err) => {
          console.error('Stream logging error (non-blocking):', err)
        })
      } catch (error: any) {
        const errorMsg = `data: ${JSON.stringify({
          error: {
            message: error.message || 'Stream error',
            type: 'server_error',
          },
        })}\n\n`
        controller.enqueue(encoder.encode(errorMsg))
        controller.close()
      }
    },
  })
}

