/**
 * Admin API for managing a specific API Key
 * PATCH: Update API key (label, defaults, restrictions, limits, expiresAt)
 * DELETE: Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function PATCH(
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
    const body = await request.json()

    // Get existing key
    const existingKey = await prisma.aiGatewayKey.findFirst({
      where: { id, orgId: activeOrg.id },
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // RBAC: admin can update any, finance/manager can update if they created it or are admin
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
      // Finance/manager can only update their own keys
      if (existingKey.createdByUserId !== user.id) {
        return NextResponse.json({ error: 'Can only update your own API keys' }, { status: 403 })
      }
    }

    const {
      label,
      defaultAppId,
      defaultProjectId,
      defaultClientId,
      defaultTeamId,
      allowedModels,
      blockedModels,
      requireAttribution,
      rateLimitRpm,
      dailyCostLimitEur,
      monthlyCostLimitEur,
      expiresAt,
      enabled,
    } = body

    // Update key with audit log
    const updatedKey = await prisma.$transaction(async (tx) => {
      const key = await tx.aiGatewayKey.update({
        where: { id },
        data: {
          label: label !== undefined ? label : undefined,
          defaultAppId: defaultAppId !== undefined ? defaultAppId : undefined,
          defaultProjectId: defaultProjectId !== undefined ? defaultProjectId : undefined,
          defaultClientId: defaultClientId !== undefined ? defaultClientId : undefined,
          defaultTeamId: defaultTeamId !== undefined ? defaultTeamId : undefined,
          allowedModels: allowedModels !== undefined ? (Array.isArray(allowedModels) ? allowedModels : Prisma.JsonNull) : undefined,
          blockedModels: blockedModels !== undefined ? (Array.isArray(blockedModels) ? blockedModels : Prisma.JsonNull) : undefined,
          requireAttribution: requireAttribution !== undefined ? requireAttribution : undefined,
          rateLimitRpm: rateLimitRpm !== undefined ? rateLimitRpm : undefined,
          dailyCostLimitEur: dailyCostLimitEur !== undefined ? dailyCostLimitEur : undefined,
          monthlyCostLimitEur: monthlyCostLimitEur !== undefined ? monthlyCostLimitEur : undefined,
          expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
          enabled: enabled !== undefined ? enabled : undefined,
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await tx.apiKeyAudit.create({
        data: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          actorUserId: user.id,
          action: 'UPDATE',
          metaJson: JSON.stringify({ changes: Object.keys(body) }),
        },
      })

      return key
    })

    return NextResponse.json({ key: updatedKey })
  } catch (error: any) {
    console.error('Update API key error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update API key' }, { status: 500 })
  }
}

export async function DELETE(
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

    // RBAC: admin can revoke any, finance/manager can revoke if they created it
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
        return NextResponse.json({ error: 'Can only revoke your own API keys' }, { status: 403 })
      }
    }

    // Revoke key (set status=revoked) with audit log
    const revokedKey = await prisma.$transaction(async (tx) => {
      const key = await tx.aiGatewayKey.update({
        where: { id },
        data: {
          status: 'revoked',
          enabled: false,
          revokedAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await tx.apiKeyAudit.create({
        data: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          actorUserId: user.id,
          action: 'REVOKE',
          metaJson: JSON.stringify({ keyPrefix: key.keyPrefix }),
        },
      })

      return key
    })

    return NextResponse.json({ key: revokedKey })
  } catch (error: any) {
    console.error('Revoke API key error:', error)
    return NextResponse.json({ error: error.message || 'Failed to revoke API key' }, { status: 500 })
  }
}

