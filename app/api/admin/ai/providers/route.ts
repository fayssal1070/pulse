import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { encryptSecret } from '@/lib/ai/providers/crypto'
import { AiProvider, AiProviderConnectionStatus } from '@prisma/client'
import { getOrgPlan, getEntitlements, assertEntitlement, EntitlementError } from '@/lib/billing/entitlements'

/**
 * GET /api/admin/ai/providers
 * List all provider connections for org (without API keys)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    await requireAdmin()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const connections = await prisma.aiProviderConnection.findMany({
      where: { orgId: activeOrg.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        name: true,
        status: true,
        keyLast4: true,
        createdAt: true,
        updatedAt: true,
        // Never return encryptedApiKey
      },
    })

    return NextResponse.json({ connections })
  } catch (error: any) {
    console.error('Error fetching AI providers:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch providers' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai/providers
 * Create a new provider connection
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
    const { provider, name, apiKey } = body

    if (!provider || !name || !apiKey) {
      return NextResponse.json(
        { error: 'provider, name, and apiKey are required' },
        { status: 400 }
      )
    }

    // Validate provider enum
    const providerEnum = provider.toUpperCase() as AiProvider
    if (!Object.values(AiProvider).includes(providerEnum)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${Object.values(AiProvider).join(', ')}` },
        { status: 400 }
      )
    }

    // Encrypt API key
    const { ciphertext, last4 } = encryptSecret(apiKey)

    // Check for duplicate (orgId, provider, name)
    const existing = await prisma.aiProviderConnection.findUnique({
      where: {
        orgId_provider_name: {
          orgId: activeOrg.id,
          provider: providerEnum,
          name: name.trim(),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Provider connection with name "${name}" already exists for ${provider}` },
        { status: 400 }
      )
    }

    // Check entitlements: max providers
    try {
      const plan = await getOrgPlan(activeOrg.id)
      const entitlements = getEntitlements(plan)
      
      // Count current providers
      const currentProviderCount = await prisma.aiProviderConnection.count({
        where: { orgId: activeOrg.id },
      })
      
      assertEntitlement(entitlements, 'ai_routing_providers', {
        currentValue: currentProviderCount,
      })
    } catch (error: any) {
      if (error instanceof EntitlementError) {
        const plan = await getOrgPlan(activeOrg.id)
        return NextResponse.json(
          {
            ok: false,
            code: 'upgrade_required',
            feature: error.feature,
            plan,
            required: error.requiredPlan,
            message: error.message,
          },
          { status: 403 }
        )
      }
      throw error
    }

    const connection = await prisma.aiProviderConnection.create({
      data: {
        orgId: activeOrg.id,
        provider: providerEnum,
        name: name.trim(),
        status: AiProviderConnectionStatus.ACTIVE,
        encryptedApiKey: ciphertext,
        keyLast4: last4,
      },
      select: {
        id: true,
        provider: true,
        name: true,
        status: true,
        keyLast4: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ connection }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating AI provider:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Provider connection already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Failed to create provider' }, { status: 500 })
  }
}

