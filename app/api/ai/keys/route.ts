import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const isAdminUser = await isAdmin()

    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const keys = await prisma.aiGatewayKey.findMany({
      where: {
        orgId: activeOrg.id,
      },
      select: {
        id: true,
        keyPrefix: true,
        status: true,
        createdByUserId: true,
        createdAt: true,
        revokedAt: true,
        // Never return keyHash
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ keys })
  } catch (error: any) {
    console.error('Get AI keys error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get keys' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const isAdminUser = await isAdmin()

    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Generate API key
    const apiKey = `pulse_${randomBytes(32).toString('hex')}`
    const keyHash = createHash('sha256').update(apiKey).digest('hex')
    const keyPrefix = apiKey.substring(0, 8)

    // Create key in DB
    const key = await prisma.aiGatewayKey.create({
      data: {
        orgId: activeOrg.id,
        keyHash,
        keyPrefix,
        status: 'active',
        createdByUserId: user.id,
      },
    })

    // Return key ONLY ONCE (never again)
    return NextResponse.json({
      key: {
        id: key.id,
        keyPrefix: key.keyPrefix,
        apiKey, // ONLY returned on creation
        createdAt: key.createdAt,
      },
      warning: 'Save this API key now. It will not be shown again.',
    })
  } catch (error: any) {
    console.error('Create AI key error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create key' }, { status: 500 })
  }
}

