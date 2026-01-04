import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/seed
 * Admin-only endpoint to seed directory (Team, Project, App, Client) if absent
 * Idempotent: creates only if missing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    await requireAdmin()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const results: Record<string, { created: boolean; id: string }> = {}

    // Check and create Team (optional)
    const teams = await prisma.team.findMany({
      where: { orgId: activeOrg.id },
      take: 1,
    })

    if (teams.length === 0) {
      const team = await prisma.team.create({
        data: {
          orgId: activeOrg.id,
          name: 'Default Team',
        },
      })
      results.team = { created: true, id: team.id }
    } else {
      results.team = { created: false, id: teams[0].id }
    }

    // Check and create Project
    const projects = await prisma.project.findMany({
      where: { orgId: activeOrg.id },
      take: 1,
    })

    if (projects.length === 0) {
      const project = await prisma.project.create({
        data: {
          orgId: activeOrg.id,
          name: 'Default Project',
        },
      })
      results.project = { created: true, id: project.id }
    } else {
      results.project = { created: false, id: projects[0].id }
    }

    // Check and create App
    const apps = await prisma.app.findMany({
      where: { orgId: activeOrg.id },
      take: 1,
    })

    if (apps.length === 0) {
      const app = await prisma.app.create({
        data: {
          orgId: activeOrg.id,
          name: 'Default App',
          slug: 'default-app',
        },
      })
      results.app = { created: true, id: app.id }
    } else {
      results.app = { created: false, id: apps[0].id }
    }

    // Check and create Client
    const clients = await prisma.client.findMany({
      where: { orgId: activeOrg.id },
      take: 1,
    })

    if (clients.length === 0) {
      const client = await prisma.client.create({
        data: {
          orgId: activeOrg.id,
          name: 'Default Client',
        },
      })
      results.client = { created: true, id: client.id }
    } else {
      results.client = { created: false, id: clients[0].id }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Seed completed (idempotent)',
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to seed' }, { status: 500 })
  }
}

