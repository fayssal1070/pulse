import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const role = await getUserRole(activeOrg.id)
    const searchParams = request.nextUrl.searchParams

    // Build where clause
    const where: any = {
      orgId: activeOrg.id,
    }

    // Filters
    const source = searchParams.get('source')
    const provider = searchParams.get('provider')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const teamId = searchParams.get('teamId')
    const projectId = searchParams.get('projectId')
    const appId = searchParams.get('appId')
    const clientId = searchParams.get('clientId')
    const model = searchParams.get('model')
    const service = searchParams.get('service')
    const groupBy = searchParams.get('groupBy')?.split(',').filter(Boolean) || []

    if (source) {
      where.source = source
    }
    if (provider) {
      where.provider = provider
    }
    if (startDate) {
      where.occurredAt = { ...where.occurredAt, gte: new Date(startDate) }
    }
    if (endDate) {
      where.occurredAt = { ...where.occurredAt, lte: new Date(endDate) }
    }
    if (service) {
      where.service = service
    }

    // Fetch all events (for filtering by dimensions in memory)
    const allEvents = await prisma.costEvent.findMany({
      where,
      select: {
        id: true,
        occurredAt: true,
        source: true,
        provider: true,
        service: true,
        amountEur: true,
        amountUsd: true,
        currency: true,
        dimensions: true,
      },
    })

    // Filter by dimensions in memory (Prisma doesn't support JSON path queries easily)
    let filteredEvents = allEvents

    // RBAC: users can only see their own costs
    if (role === 'user') {
      filteredEvents = filteredEvents.filter((e) => {
        const dims = (e.dimensions as any) || {}
        return dims.userId === user.id
      })
    }

    // Dimension filters
    if (userId && (role === 'admin' || role === 'finance' || role === 'manager')) {
      filteredEvents = filteredEvents.filter((e) => {
        const dims = (e.dimensions as any) || {}
        return dims.userId === userId
      })
    }
    if (teamId) {
      filteredEvents = filteredEvents.filter((e) => {
        const dims = (e.dimensions as any) || {}
        return dims.teamId === teamId
      })
    }
    if (projectId) {
      filteredEvents = filteredEvents.filter((e) => {
        const dims = (e.dimensions as any) || {}
        return dims.projectId === projectId
      })
    }
    if (appId) {
      filteredEvents = filteredEvents.filter((e) => {
        const dims = (e.dimensions as any) || {}
        return dims.appId === appId
      })
    }
    if (clientId) {
      filteredEvents = filteredEvents.filter((e) => {
        const dims = (e.dimensions as any) || {}
        return dims.clientId === clientId
      })
    }
    if (model) {
      filteredEvents = filteredEvents.filter((e) => {
        const dims = (e.dimensions as any) || {}
        return dims.model === model
      })
    }

    // If groupBy is specified, aggregate
    if (groupBy.length > 0) {
      const grouped = new Map<string, { amountEur: number; amountUsd: number | null; count: number }>()

      for (const event of filteredEvents) {
        const keyParts: string[] = []
        if (groupBy.includes('source')) keyParts.push(`source:${event.source}`)
        if (groupBy.includes('provider')) keyParts.push(`provider:${event.provider || 'N/A'}`)
        if (groupBy.includes('service')) keyParts.push(`service:${event.service || 'N/A'}`)
        if (groupBy.includes('model')) {
          const dims = (event.dimensions as any) || {}
          keyParts.push(`model:${dims.model || 'N/A'}`)
        }
        if (groupBy.includes('user')) {
          const dims = (event.dimensions as any) || {}
          keyParts.push(`user:${dims.userId || 'N/A'}`)
        }
        if (groupBy.includes('team')) {
          const dims = (event.dimensions as any) || {}
          keyParts.push(`team:${dims.teamId || 'N/A'}`)
        }
        if (groupBy.includes('project')) {
          const dims = (event.dimensions as any) || {}
          keyParts.push(`project:${dims.projectId || 'N/A'}`)
        }
        if (groupBy.includes('app')) {
          const dims = (event.dimensions as any) || {}
          keyParts.push(`app:${dims.appId || 'N/A'}`)
        }
        if (groupBy.includes('client')) {
          const dims = (event.dimensions as any) || {}
          keyParts.push(`client:${dims.clientId || 'N/A'}`)
        }
        if (groupBy.includes('day')) {
          const date = new Date(event.occurredAt)
          keyParts.push(`day:${date.toISOString().split('T')[0]}`)
        }

        const key = keyParts.join('|')
        const existing = grouped.get(key) || { amountEur: 0, amountUsd: 0, count: 0 }
        grouped.set(key, {
          amountEur: existing.amountEur + Number(event.amountEur),
          amountUsd: existing.amountUsd + (event.amountUsd ? Number(event.amountUsd) : 0),
          count: existing.count + 1,
        })
      }

      const results = Array.from(grouped.entries()).map(([key, data]) => {
        const parts = key.split('|').reduce((acc, part) => {
          const [k, v] = part.split(':')
          acc[k] = v
          return acc
        }, {} as Record<string, string>)

        return {
          ...parts,
          amountEur: data.amountEur,
          amountUsd: data.amountUsd,
          count: data.count,
        }
      })

      return NextResponse.json({ results, total: results.length })
    }

    // No groupBy: return paginated list
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const paginatedEvents = filteredEvents.slice(skip, skip + limit)

    return NextResponse.json({
      events: paginatedEvents.map((e) => ({
        ...e,
        amountEur: Number(e.amountEur),
        amountUsd: e.amountUsd ? Number(e.amountUsd) : null,
      })),
      pagination: {
        page,
        limit,
        total: filteredEvents.length,
        totalPages: Math.ceil(filteredEvents.length / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching costs:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

