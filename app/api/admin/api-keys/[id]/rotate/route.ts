/**
 * Admin API for rotating an API key
 * POST: Generate new secret for existing key
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { randomBytes, createHash } from 'crypto'
import { getOrgPlan, getEntitlements, assertEntitlement, EntitlementError } from '@/lib/billing/entitlements'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const { id } = await params

    // Get existing key
    const existingKey = await prisma.aiGatewayKey.findFirst({
      where: { id, orgId: activeOrg.id },
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (existingKey.status !== 'active') {
      return NextResponse.json({ error: 'Cannot rotate a revoked key' }, { status: 400 })
    }

    // RBAC: admin can rotate any, finance/manager can rotate if they created it
    const membership = await prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: activeOrg.id,
        },
      },
      select: { role: true },
    })

    const role = membership?.role || 'member'
    if (role !== 'admin' && role !== 'owner') {
      if (role !== 'finance' && role !== 'manager') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      if (existingKey.createdByUserId !== user.id) {
        return NextResponse.json({ error: 'Can only rotate your own API keys' }, { status: 403 })
      }
    }

    // Check entitlements: API key rotation
    try {
      const plan = await getOrgPlan(activeOrg.id)
      const entitlements = getEntitlements(plan)
      assertEntitlement(entitlements, 'api_keys_rotation')
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

    // Generate new key secret
    const newKeyValue = `pulse_key_${randomBytes(32).toString('hex')}`
    const newKeyPrefix = newKeyValue.substring(0, 12)
    const newKeyHash = createHash('sha256').update(newKeyValue).digest('hex')

    // Update key with new hash/prefix and audit log
    const result = await prisma.$transaction(async (tx) => {
      const key = await tx.aiGatewayKey.update({
        where: { id },
        data: {
          keyHash: newKeyHash,
          keyPrefix: newKeyPrefix,
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await tx.apiKeyAudit.create({
        data: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          actorUserId: user.id,
          action: 'ROTATE',
          metaJson: JSON.stringify({ oldPrefix: existingKey.keyPrefix, newPrefix: newKeyPrefix }),
        },
      })

      return { key, secret: newKeyValue }
    })

    // Return new secret (only time it's shown)
    return NextResponse.json({
      key: {
        id: result.key.id,
        label: result.key.label,
        keyPrefix: result.key.keyPrefix,
        secret: result.secret, // Show secret only once
      },
      message: 'API key rotated successfully. Old key is now invalid. Save this new secret - it will not be shown again.',
    })
  } catch (error: any) {
    console.error('Rotate API key error:', error)
    return NextResponse.json({ error: error.message || 'Failed to rotate API key' }, { status: 500 })
  }
}

