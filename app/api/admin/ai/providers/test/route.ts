import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { decryptSecret } from '@/lib/ai/providers/crypto'
import { callOpenAI } from '@/lib/ai/providers/openai'
import { callAnthropic } from '@/lib/ai/providers/anthropic'
import { callXAI } from '@/lib/ai/providers/xai'
import { callGoogle } from '@/lib/ai/providers/google'
import { callMistral } from '@/lib/ai/providers/mistral'

/**
 * POST /api/admin/ai/providers/test
 * Test a provider connection with a minimal request
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    await requireAdmin()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const body = await request.json()
    const { providerConnectionId } = body

    if (!providerConnectionId) {
      return NextResponse.json({ error: 'providerConnectionId is required' }, { status: 400 })
    }

    // Find connection
    const connection = await prisma.aiProviderConnection.findFirst({
      where: {
        id: providerConnectionId,
        orgId: activeOrg.id,
      },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Provider connection not found' }, { status: 404 })
    }

    // Decrypt API key
    const apiKey = decryptSecret(connection.encryptedApiKey)

    // Create minimal test request based on provider
    const providerLower = connection.provider.toLowerCase()
    const testMessages = [{ role: 'user', content: 'test' }]
    const startTime = Date.now()

    try {
      let result: any

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout after 10s')), 10000)
      )

      switch (providerLower) {
        case 'openai': {
          result = await Promise.race([
            callOpenAI(apiKey, {
              model: 'gpt-3.5-turbo',
              messages: testMessages,
              maxTokens: 5,
            }),
            timeoutPromise,
          ])
          break
        }
        case 'anthropic': {
          result = await Promise.race([
            callAnthropic(apiKey, {
              model: 'claude-3-haiku-20240307',
              messages: testMessages,
              maxTokens: 5,
            }),
            timeoutPromise,
          ])
          break
        }
        case 'xai': {
          result = await Promise.race([
            callXAI(apiKey, {
              model: 'grok-beta',
              messages: testMessages,
              maxTokens: 5,
            }),
            timeoutPromise,
          ])
          break
        }
        case 'google': {
          result = await Promise.race([
            callGoogle(apiKey, {
              model: 'gemini-pro',
              messages: testMessages,
              maxTokens: 5,
            }),
            timeoutPromise,
          ])
          break
        }
        case 'mistral': {
          result = await Promise.race([
            callMistral(apiKey, {
              model: 'mistral-tiny',
              messages: testMessages,
              maxTokens: 5,
            }),
            timeoutPromise,
          ])
          break
        }
        default:
          return NextResponse.json({ error: `Unsupported provider: ${connection.provider}` }, { status: 400 })
      }

      const latencyMs = Date.now() - startTime

      return NextResponse.json({
        ok: true,
        latencyMs,
        provider: connection.provider,
      })
    } catch (testError: any) {
      const latencyMs = Date.now() - startTime
      
      // Sanitize error message (never expose API keys)
      const errorMessage = testError.message || 'Test failed'
      const sanitizedError = errorMessage
        .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]')
        .replace(/Bearer\s+[a-zA-Z0-9]+/g, 'Bearer [REDACTED]')

      return NextResponse.json({
        ok: false,
        error: sanitizedError,
        latencyMs,
      })
    }
  } catch (error: any) {
    console.error('Error testing provider:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to test provider' }, { status: 500 })
  }
}

