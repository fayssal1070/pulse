import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { AiProvider, AiProviderConnectionStatus } from '@prisma/client'

/**
 * GET /api/admin/ai/routes
 * List all model routes for org
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    await requireAdmin()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const routes = await prisma.aiModelRoute.findMany({
      where: { orgId: activeOrg.id },
      orderBy: [{ provider: 'asc' }, { priority: 'asc' }],
    })

    return NextResponse.json({ routes })
  } catch (error: any) {
    console.error('Error fetching AI routes:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch routes' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai/routes
 * Create a new model route
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
    const { provider, model, priority, enabled, maxCostPerReqEUR } = body

    if (!provider || !model) {
      return NextResponse.json({ error: 'provider and model are required' }, { status: 400 })
    }

    // Validate provider enum
    const providerEnum = provider.toUpperCase() as AiProvider
    if (!Object.values(AiProvider).includes(providerEnum)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${Object.values(AiProvider).join(', ')}` },
        { status: 400 }
      )
    }

    // Verify provider connection exists and is ACTIVE
    const connection = await prisma.aiProviderConnection.findFirst({
      where: {
        orgId: activeOrg.id,
        provider: providerEnum,
        status: AiProviderConnectionStatus.ACTIVE,
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: `No active connection found for provider ${provider}. Create a provider connection first.` },
        { status: 400 }
      )
    }

    // Check for duplicate (orgId, provider, model)
    const existing = await prisma.aiModelRoute.findUnique({
      where: {
        orgId_provider_model: {
          orgId: activeOrg.id,
          provider: providerEnum,
          model: model.trim(),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Route for model "${model}" with provider ${provider} already exists` },
        { status: 400 }
      )
    }

    const route = await prisma.aiModelRoute.create({
      data: {
        orgId: activeOrg.id,
        provider: providerEnum,
        model: model.trim(),
        enabled: enabled !== undefined ? enabled : true,
        priority: priority !== undefined ? priority : 100,
        maxCostPerReqEUR: maxCostPerReqEUR !== undefined ? maxCostPerReqEUR : null,
      },
    })

    return NextResponse.json({ route }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating AI route:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Route already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Failed to create route' }, { status: 500 })
  }
}

