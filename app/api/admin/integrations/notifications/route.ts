/**
 * Admin API for managing notification integrations (Slack, Teams)
 * GET: List integrations
 * POST: Update Slack/Teams webhook URLs
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'
import { encrypt, getLast4 } from '@/lib/notifications/encryption'
import { sendSlack } from '@/lib/notifications/slack'
import { sendTeams } from '@/lib/notifications/teams'
import { decrypt } from '@/lib/notifications/encryption'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }
    await requireRole(activeOrg.id, 'admin')

    const integration = await prisma.orgIntegration.findUnique({
      where: { orgId: activeOrg.id },
      select: {
        slackWebhookUrlLast4: true,
        teamsWebhookUrlLast4: true,
        telegramBotTokenLast4: true,
      },
    })

    return NextResponse.json({
      slack: {
        configured: !!integration?.slackWebhookUrlLast4,
        last4: integration?.slackWebhookUrlLast4 || null,
      },
      teams: {
        configured: !!integration?.teamsWebhookUrlLast4,
        last4: integration?.teamsWebhookUrlLast4 || null,
      },
      telegram: {
        configured: !!integration?.telegramBotTokenLast4,
        last4: integration?.telegramBotTokenLast4 || null,
      },
    })
  } catch (error: any) {
    console.error('Get notification integrations error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get integrations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }
    await requireRole(activeOrg.id, 'admin')

    const body = await request.json()
    const { action, channel, webhookUrl } = body

    if (!action || !channel) {
      return NextResponse.json({ error: 'action and channel are required' }, { status: 400 })
    }

    // Get or create integration
    let integration = await prisma.orgIntegration.findUnique({
      where: { orgId: activeOrg.id },
    })

    if (!integration) {
      integration = await prisma.orgIntegration.create({
        data: { orgId: activeOrg.id },
      })
    }

    if (action === 'connect') {
      if (!webhookUrl || typeof webhookUrl !== 'string') {
        return NextResponse.json({ error: 'webhookUrl is required for connect action' }, { status: 400 })
      }

      if (channel === 'slack') {
        const encrypted = encrypt(webhookUrl)
        const last4 = getLast4(webhookUrl.split('/').pop() || webhookUrl)

        await prisma.orgIntegration.update({
          where: { orgId: activeOrg.id },
          data: {
            slackWebhookUrlEnc: encrypted,
            slackWebhookUrlLast4: last4,
          },
        })

        return NextResponse.json({ success: true, last4 })
      } else if (channel === 'teams') {
        const encrypted = encrypt(webhookUrl)
        const last4 = getLast4(webhookUrl.split('/').pop() || webhookUrl)

        await prisma.orgIntegration.update({
          where: { orgId: activeOrg.id },
          data: {
            teamsWebhookUrlEnc: encrypted,
            teamsWebhookUrlLast4: last4,
          },
        })

        return NextResponse.json({ success: true, last4 })
      } else {
        return NextResponse.json({ error: 'Invalid channel. Use "slack" or "teams"' }, { status: 400 })
      }
    } else if (action === 'disconnect') {
      if (channel === 'slack') {
        await prisma.orgIntegration.update({
          where: { orgId: activeOrg.id },
          data: {
            slackWebhookUrlEnc: null,
            slackWebhookUrlLast4: null,
          },
        })
      } else if (channel === 'teams') {
        await prisma.orgIntegration.update({
          where: { orgId: activeOrg.id },
          data: {
            teamsWebhookUrlEnc: null,
            teamsWebhookUrlLast4: null,
          },
        })
      } else {
        return NextResponse.json({ error: 'Invalid channel. Use "slack" or "teams"' }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    } else if (action === 'test') {
      if (!channel || (channel !== 'slack' && channel !== 'teams')) {
        return NextResponse.json({ error: 'Invalid channel for test. Use "slack" or "teams"' }, { status: 400 })
      }

      const integration = await prisma.orgIntegration.findUnique({
        where: { orgId: activeOrg.id },
        select: {
          slackWebhookUrlEnc: true,
          teamsWebhookUrlEnc: true,
        },
      })

      if (channel === 'slack' && integration?.slackWebhookUrlEnc) {
        const webhookUrl = decrypt(integration.slackWebhookUrlEnc)
        const result = await sendSlack({
          webhookUrl,
          text: 'Pulse test notification',
          title: 'Pulse Integration Test',
        })

        if (result.success) {
          return NextResponse.json({ success: true, message: 'Test message sent successfully' })
        } else {
          return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }
      } else if (channel === 'teams' && integration?.teamsWebhookUrlEnc) {
        const webhookUrl = decrypt(integration.teamsWebhookUrlEnc)
        const result = await sendTeams({
          webhookUrl,
          text: 'Pulse test notification',
          title: 'Pulse Integration Test',
        })

        if (result.success) {
          return NextResponse.json({ success: true, message: 'Test message sent successfully' })
        } else {
          return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: `${channel} is not configured` }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "connect", "disconnect", or "test"' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Update notification integrations error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update integrations' }, { status: 500 })
  }
}

