import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'

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

    const policies = await prisma.aiPolicy.findMany({
      where: {
        orgId: activeOrg.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ policies })
  } catch (error: any) {
    console.error('Get AI policies error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get policies' }, { status: 500 })
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

    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const policy = await prisma.aiPolicy.create({
      data: {
        orgId: activeOrg.id,
        name: body.name,
        allowedModels: body.allowedModels || null,
        blockedModels: body.blockedModels || null,
        maxCostPerDayEur: body.maxCostPerDayEur ? parseFloat(body.maxCostPerDayEur) : null,
        maxTokensPerReq: body.maxTokensPerReq ? parseInt(body.maxTokensPerReq) : null,
        enabled: body.enabled !== false,
      },
    })

    return NextResponse.json({ policy })
  } catch (error: any) {
    console.error('Create AI policy error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create policy' }, { status: 500 })
  }
}

