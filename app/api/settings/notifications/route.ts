import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/settings/notifications
 * Get notification preferences for current user
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    let preference = await prisma.notificationPreference.findUnique({
      where: {
        orgId_userId: {
          orgId: activeOrg.id,
          userId: user.id,
        },
      },
    })

    // Create default if doesn't exist
    if (!preference) {
      preference = await prisma.notificationPreference.create({
        data: {
          orgId: activeOrg.id,
          userId: user.id,
          emailEnabled: true,
          telegramEnabled: false,
          slackEnabled: false,
          teamsEnabled: false,
        },
      })
    }

    // Check org integrations to show available channels
    const integration = await prisma.orgIntegration.findUnique({
      where: { orgId: activeOrg.id },
      select: {
        slackWebhookUrlEnc: true,
        teamsWebhookUrlEnc: true,
        telegramBotTokenEnc: true,
      },
    })

    return NextResponse.json({
      ...preference,
      integrations: {
        slackAvailable: !!integration?.slackWebhookUrlEnc,
        teamsAvailable: !!integration?.teamsWebhookUrlEnc,
        telegramAvailable: !!integration?.telegramBotTokenEnc,
      },
    })
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch preferences' }, { status: 500 })
  }
}

/**
 * POST/PATCH /api/settings/notifications
 * Update notification preferences for current user
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const body = await request.json()
    const { emailEnabled, telegramEnabled, telegramChatId, slackEnabled, teamsEnabled } = body

    // Check entitlements for notification channels
    try {
      const { getOrgPlan, getEntitlements, assertEntitlement, EntitlementError } = await import('@/lib/billing/entitlements')
      const plan = await getOrgPlan(activeOrg.id)
      const entitlements = getEntitlements(plan)
      
      if (telegramEnabled) {
        assertEntitlement(entitlements, 'telegram_notifications')
      }
      if (slackEnabled) {
        assertEntitlement(entitlements, 'slack_notifications')
      }
      if (teamsEnabled) {
        assertEntitlement(entitlements, 'teams_notifications')
      }
    } catch (error: any) {
      const { EntitlementError: EntitlementErrorClass, getOrgPlan: getOrgPlanFn } = await import('@/lib/billing/entitlements')
      if (error instanceof EntitlementErrorClass) {
        const plan = await getOrgPlanFn(activeOrg.id)
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

    // Validate telegramChatId if telegramEnabled
    if (telegramEnabled && !telegramChatId) {
      return NextResponse.json({ error: 'Telegram Chat ID is required when Telegram is enabled' }, { status: 400 })
    }

    // Check if org has Slack/Teams configured
    const integration = await prisma.orgIntegration.findUnique({
      where: { orgId: activeOrg.id },
      select: {
        slackWebhookUrlEnc: true,
        teamsWebhookUrlEnc: true,
      },
    })

    if (slackEnabled && !integration?.slackWebhookUrlEnc) {
      return NextResponse.json({ error: 'Slack is not configured for this organization. Ask your admin to connect Slack.' }, { status: 400 })
    }

    if (teamsEnabled && !integration?.teamsWebhookUrlEnc) {
      return NextResponse.json({ error: 'Teams is not configured for this organization. Ask your admin to connect Teams.' }, { status: 400 })
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        orgId_userId: {
          orgId: activeOrg.id,
          userId: user.id,
        },
      },
      update: {
        emailEnabled: emailEnabled !== undefined ? emailEnabled : undefined,
        telegramEnabled: telegramEnabled !== undefined ? telegramEnabled : undefined,
        telegramChatId: telegramChatId !== undefined ? telegramChatId : undefined,
        slackEnabled: slackEnabled !== undefined ? slackEnabled : undefined,
        teamsEnabled: teamsEnabled !== undefined ? teamsEnabled : undefined,
      },
      create: {
        orgId: activeOrg.id,
        userId: user.id,
        emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
        telegramEnabled: telegramEnabled !== undefined ? telegramEnabled : false,
        telegramChatId: telegramChatId || null,
        slackEnabled: slackEnabled !== undefined ? slackEnabled : false,
        teamsEnabled: teamsEnabled !== undefined ? teamsEnabled : false,
      },
    })

    return NextResponse.json(preference)
  } catch (error: any) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: error.message || 'Failed to update preferences' }, { status: 500 })
  }
}

