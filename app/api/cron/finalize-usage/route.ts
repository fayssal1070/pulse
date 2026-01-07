/**
 * POST /api/cron/finalize-usage
 * Finalize monthly usage and create Stripe invoice items for overages
 * Should be called at the end of each month (via Vercel Cron or similar)
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateMonthlyUsage } from '@/lib/billing/overage'
import { prisma } from '@/lib/prisma'
import { getStripeClient } from '@/lib/stripe/client'
import Stripe from 'stripe'

export const maxDuration = 60 // Cron jobs can take time

export async function POST(request: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    // Process previous month (month just ended)
    const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth()

    console.log(`Finalizing usage for ${targetYear}-${targetMonth}`)

    // Get all organizations with active subscriptions
    const orgs = await prisma.organization.findMany({
      where: {
        subscriptionStatus: {
          in: ['active', 'trialing'],
        },
        stripeCustomerId: {
          not: null,
        },
      },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    })

    const stripe = getStripeClient()
    if (!stripe) {
      console.error('Stripe not configured, skipping invoice item creation')
    }

    let processed = 0
    let errors = 0

    for (const org of orgs) {
      try {
        // Update monthly usage
        const usage = await updateMonthlyUsage(org.id, targetYear, targetMonth)

        // Only create invoice item if there's overage and not already finalized
        if (usage.overageAmountEUR > 0 && !usage.finalized && stripe && org.stripeCustomerId) {
          // Create Stripe invoice item
          const invoiceItem = await stripe.invoiceItems.create({
            customer: org.stripeCustomerId,
            amount: Math.round(usage.overageAmountEUR * 100), // Convert to cents
            currency: 'eur',
            description: `AI usage overage — ${new Date(targetYear, targetMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
            metadata: {
              orgId: org.id,
              year: targetYear.toString(),
              month: targetMonth.toString(),
              overageSpendEUR: usage.overageSpendEUR.toString(),
            },
          })

          // Mark as finalized
          await prisma.monthlyUsage.update({
            where: { id: usage.id },
            data: {
              finalized: true,
              stripeInvoiceItemId: invoiceItem.id,
            },
          })

          console.log(`Created invoice item ${invoiceItem.id} for org ${org.id}: ${usage.overageAmountEUR} EUR`)
        } else if (usage.overageAmountEUR === 0) {
          // Mark as finalized even if no overage (for tracking)
          await prisma.monthlyUsage.update({
            where: { id: usage.id },
            data: { finalized: true },
          })
        }

        processed++
      } catch (error: any) {
        console.error(`Error processing org ${org.id}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      targetYear,
      targetMonth,
      processed,
      errors,
    })
  } catch (error: any) {
    console.error('Finalize usage error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

