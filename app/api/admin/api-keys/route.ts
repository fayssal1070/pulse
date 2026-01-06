/**
 * Admin API for managing API Keys (V2)
 * GET: List API keys
 * POST: Create new API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'
import { randomBytes, createHash } from 'crypto'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // RBAC: admin can see all, finance/manager can see all, users can see only their own
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
    const isRestrictedRole = role !== 'admin' && role !== 'owner'

    const whereClause: any = {
      orgId: activeOrg.id,
    }

    // Non-admin users can only see their own keys
    if (isRestrictedRole) {
      whereClause.createdByUserId = user.id
    }

    const keys = await prisma.aiGatewayKey.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        keyPrefix: true,
        status: true,
        enabled: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        defaultAppId: true,
        defaultProjectId: true,
        defaultClientId: true,
        defaultTeamId: true,
        rateLimitRpm: true,
        dailyCostLimitEur: true,
        monthlyCostLimitEur: true,
        defaultApp: {
          select: { name: true },
        },
        defaultProject: {
          select: { name: true },
        },
        defaultClient: {
          select: { name: true },
        },
        defaultTeam: {
          select: { name: true },
        },
        createdByUserId: true,
      },
    })

    return NextResponse.json({ keys })
  } catch (error: any) {
    console.error('Get API keys error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get API keys' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // RBAC: admin/finance/manager can create keys
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
    if (role !== 'admin' && role !== 'owner' && role !== 'finance' && role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions to create API keys' }, { status: 403 })
    }

    const body = await request.json()
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
    } = body

    // Generate API key
    const keyValue = `pulse_key_${randomBytes(32).toString('hex')}`
    const keyPrefix = keyValue.substring(0, 12) // First 12 chars
    const keyHash = createHash('sha256').update(keyValue).digest('hex')

    // Create key in transaction with audit log
    const result = await prisma.$transaction(async (tx) => {
      const apiKey = await tx.aiGatewayKey.create({
        data: {
          orgId: activeOrg.id,
          createdByUserId: user.id,
          keyHash,
          keyPrefix,
          label: label || null,
          status: 'active',
          enabled: true,
          defaultAppId: defaultAppId || null,
          defaultProjectId: defaultProjectId || null,
          defaultClientId: defaultClientId || null,
          defaultTeamId: defaultTeamId || null,
          allowedModels: allowedModels && Array.isArray(allowedModels) ? allowedModels : Prisma.JsonNull,
          blockedModels: blockedModels && Array.isArray(blockedModels) ? blockedModels : Prisma.JsonNull,
          requireAttribution: requireAttribution !== undefined ? requireAttribution : null,
          rateLimitRpm: rateLimitRpm || null,
          dailyCostLimitEur: dailyCostLimitEur || null,
          monthlyCostLimitEur: monthlyCostLimitEur || null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      })

      // Create audit log
      await tx.apiKeyAudit.create({
        data: {
          orgId: activeOrg.id,
          apiKeyId: apiKey.id,
          actorUserId: user.id,
          action: 'CREATE',
          metaJson: JSON.stringify({ label, keyPrefix }),
        },
      })

      return { apiKey, secret: keyValue }
    })

    // Return key with secret (only time it's shown)
    return NextResponse.json({
      key: {
        id: result.apiKey.id,
        label: result.apiKey.label,
        keyPrefix: result.apiKey.keyPrefix,
        secret: result.secret, // Show secret only once
      },
      message: 'API key created successfully. Save this secret - it will not be shown again.',
    })
  } catch (error: any) {
    console.error('Create API key error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create API key' }, { status: 500 })
  }
}

