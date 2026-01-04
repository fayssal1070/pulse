import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createHash } from 'crypto'

/**
 * POST /api/admin/test-data
 * Admin-only endpoint to generate synthetic CostEvent and AiRequestLog
 * Body: { mode: "AI"|"AWS"|"BOTH", amountEUR?: number }
 * IMPORTANT: Only creates synthetic CostEvent, never touches real AWS CUR data
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
    const { mode = 'BOTH', amountEUR = 100 } = body

    if (!['AI', 'AWS', 'BOTH'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode. Must be AI, AWS, or BOTH' }, { status: 400 })
    }

    // Get directory dimensions
    const [apps, projects, clients, teams] = await Promise.all([
      prisma.app.findMany({ where: { orgId: activeOrg.id }, take: 5 }),
      prisma.project.findMany({ where: { orgId: activeOrg.id }, take: 5 }),
      prisma.client.findMany({ where: { orgId: activeOrg.id }, take: 5 }),
      prisma.team.findMany({ where: { orgId: activeOrg.id }, take: 5 }),
    ])

    if (apps.length === 0 || projects.length === 0 || clients.length === 0) {
      return NextResponse.json(
        { error: 'Directory incomplete. Please seed first (Team, Project, App, Client required)' },
        { status: 400 }
      )
    }

    const eventsCreated: string[] = []
    const dimensionsUsed = {
      appIds: apps.map((a) => a.id),
      projectIds: projects.map((p) => p.id),
      clientIds: clients.map((c) => c.id),
      teamIds: teams.map((t) => t.id),
    }

    // Generate 5-10 events over last 2 days
    const eventCount = Math.floor(Math.random() * 6) + 5 // 5-10
    const now = new Date()

    for (let i = 0; i < eventCount; i++) {
      const hoursAgo = Math.random() * 48 // Last 48 hours
      const occurredAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

      // Random dimension selection
      const app = apps[Math.floor(Math.random() * apps.length)]
      const project = projects[Math.floor(Math.random() * projects.length)]
      const client = clients[Math.floor(Math.random() * clients.length)]
      const team = teams.length > 0 ? teams[Math.floor(Math.random() * teams.length)] : null

      if (mode === 'AWS' || mode === 'BOTH') {
        // Create AWS CostEvent
        const awsAmount = parseFloat((Math.random() * amountEUR * 0.3 + amountEUR * 0.1).toFixed(4))
        const services = ['EC2', 'S3', 'RDS', 'Lambda', 'CloudFront']
        const service = services[Math.floor(Math.random() * services.length)]

        const uniqueHash = createHash('sha256')
          .update(`${activeOrg.id}-AWS-${occurredAt.toISOString()}-${service}-${awsAmount}-${i}`)
          .digest('hex')

        try {
          await prisma.costEvent.create({
            data: {
              orgId: activeOrg.id,
              source: 'AWS',
              occurredAt,
              amountEur: new Prisma.Decimal(awsAmount),
              amountUsd: new Prisma.Decimal(awsAmount * 1.1), // Approximate USD
              currency: 'EUR',
              provider: 'aws',
              resourceType: service,
              service,
              usageType: 'Usage',
              quantity: new Prisma.Decimal(Math.random() * 100),
              unit: 'Hrs',
              costCategory: 'Compute',
              dimensions: {
                teamId: team?.id || null,
                projectId: project.id,
                appId: app.id,
                clientId: client.id,
              },
              teamId: team?.id || null,
              projectId: project.id,
              appId: app.id,
              clientId: client.id,
              uniqueHash,
            },
          })
          eventsCreated.push(`AWS-${service}-${occurredAt.toISOString()}`)
        } catch (error: any) {
          // Skip duplicates
          if (!error.message?.includes('unique')) {
            console.error('Error creating AWS CostEvent:', error)
          }
        }
      }

      if (mode === 'AI' || mode === 'BOTH') {
        // Create AI CostEvent
        const aiAmount = parseFloat((Math.random() * amountEUR * 0.2 + amountEUR * 0.05).toFixed(4))
        const providers = ['openai', 'anthropic', 'google']
        const provider = providers[Math.floor(Math.random() * providers.length)]
        const models: Record<string, string[]> = {
          openai: ['gpt-4', 'gpt-3.5-turbo'],
          anthropic: ['claude-3-opus', 'claude-3-sonnet'],
          google: ['gemini-pro', 'gemini-ultra'],
        }
        const model = models[provider][Math.floor(Math.random() * models[provider].length)]

        const uniqueHash = createHash('sha256')
          .update(`${activeOrg.id}-AI-${occurredAt.toISOString()}-${provider}-${model}-${aiAmount}-${i}`)
          .digest('hex')

        try {
          const costEvent = await prisma.costEvent.create({
            data: {
              orgId: activeOrg.id,
              source: 'AI',
              occurredAt,
              amountEur: new Prisma.Decimal(aiAmount),
              currency: 'EUR',
              provider,
              resourceType: 'LLM_CALL',
              service: provider.charAt(0).toUpperCase() + provider.slice(1),
              usageType: 'tokens',
              quantity: new Prisma.Decimal(Math.random() * 10000),
              unit: 'TOKENS',
              costCategory: 'AI',
              dimensions: {
                teamId: team?.id || null,
                projectId: project.id,
                appId: app.id,
                clientId: client.id,
                model,
                taskType: 'completion',
              },
              teamId: team?.id || null,
              projectId: project.id,
              appId: app.id,
              clientId: client.id,
              uniqueHash,
            },
          })

          eventsCreated.push(`AI-${provider}-${occurredAt.toISOString()}`)

          // Create corresponding AiRequestLog
          await prisma.aiRequestLog.create({
            data: {
              orgId: activeOrg.id,
              occurredAt,
              teamId: team?.id || null,
              projectId: project.id,
              appId: app.id,
              clientId: client.id,
              provider,
              model,
              inputTokens: Math.floor(Math.random() * 1000),
              outputTokens: Math.floor(Math.random() * 2000),
              totalTokens: Math.floor(Math.random() * 3000),
              estimatedCostEur: new Prisma.Decimal(aiAmount),
              latencyMs: Math.floor(Math.random() * 5000),
              statusCode: 200,
              rawRef: {
                requestId: `req-${Date.now()}-${i}`,
                synthetic: true,
              },
            },
          })
        } catch (error: any) {
          // Skip duplicates
          if (!error.message?.includes('unique')) {
            console.error('Error creating AI CostEvent:', error)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      eventsCreated: eventsCreated.length,
      mode,
      dimensionsUsed,
      message: `Generated ${eventsCreated.length} synthetic cost events`,
    })
  } catch (error: any) {
    console.error('Test data generation error:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to generate test data' }, { status: 500 })
  }
}

