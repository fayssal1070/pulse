/**
 * OpenAI-compatible models endpoint
 * GET /api/v1/models
 * Returns list of available models for the organization (from AiModelRoute)
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/ai/api-key-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Authenticate API key
    const authResult = await authenticateApiKey(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { key } = authResult.result

    // Get enabled model routes for the organization
    const routes = await prisma.aiModelRoute.findMany({
      where: {
        orgId: key.orgId,
        enabled: true,
      },
      select: {
        model: true,
        provider: true,
      },
      distinct: ['model'], // Get unique models
      orderBy: {
        model: 'asc',
      },
    })

    // Format OpenAI-compatible response
    const response = {
      object: 'list',
      data: routes.map((route, index) => ({
        id: route.model,
        object: 'model',
        created: 1677610602, // Placeholder timestamp
        owned_by: route.provider.toLowerCase(),
        permission: [
          {
            id: `modelperm-${route.model}`,
            object: 'model_permission',
            created: 1677610602,
            allow_create_engine: false,
            allow_sampling: true,
            allow_logprobs: false,
            allow_search_indices: false,
            allow_view: true,
            allow_fine_tuning: false,
            organization: '*',
            group: null,
            is_blocking: false,
          },
        ],
        root: route.model,
        parent: null,
      })),
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Models list error:', error)
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Internal server error',
          type: 'server_error',
          param: null,
          code: 'internal_error',
        },
      },
      { status: 500 }
    )
  }
}

