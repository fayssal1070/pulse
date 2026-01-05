/**
 * Next.js Route Handler example using Pulse OpenAI SDK
 * 
 * Place this file at: app/api/chat/route.ts
 * 
 * Environment variables:
 *   PULSE_BASE_URL=https://pulse-sigma-eight.vercel.app/api/v1
 *   PULSE_API_KEY=your_pulse_ai_gateway_key
 */

import { PulseOpenAI } from '@pulse/openai'
import { NextResponse } from 'next/server'

const client = new PulseOpenAI({
  baseURL: process.env.PULSE_BASE_URL || 'https://pulse-sigma-eight.vercel.app/api/v1',
  apiKey: process.env.PULSE_API_KEY!,
})

export async function POST(request: Request) {
  try {
    const { messages, stream, model = 'gpt-4' } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    if (stream) {
      // Streaming response
      const streamResponse = await client.chat.completions.create({
        model,
        messages,
        stream: true,
      })

      // Convert OpenAI stream to ReadableStream for Next.js
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`
              controller.enqueue(encoder.encode(data))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error: any) {
            controller.error(error)
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    } else {
      // Non-streaming response
      const completion = await client.chat.completions.create({
        model,
        messages,
        stream: false,
      })

      return NextResponse.json(completion)
    }
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to list models
export async function GET() {
  try {
    const models = await client.openai.models.list()
    return NextResponse.json({ models: models.data })
  } catch (error: any) {
    console.error('Models API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

