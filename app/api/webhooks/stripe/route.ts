/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler for subscription events
 * Handles: checkout.session.completed, customer.subscription.*, invoice.*
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripeClient, getWebhookSecret } from '@/lib/stripe/client'
import { getPlanForPriceId } from '@/lib/stripe/plans'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export const maxDuration = 10 // Webhooks can take time

async function getRawBody(request: Request): Promise<Buffer> {
  return Buffer.from(await request.text(), 'utf-8')
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient()
  const webhookSecret = getWebhookSecret()

  if (!stripe || !webhookSecret) {
    console.error('Stripe not configured')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    // Get raw body
    const body = await getRawBody(request)
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Idempotence check: has this event been processed?
    const existingEvent = await prisma.stripeEvent.findUnique({
      where: { id: event.id },
    })

    if (existingEvent && existingEvent.status === 'PROCESSED') {
      // Already processed, return 200
      return NextResponse.json({ received: true, status: 'already_processed' })
    }

    // Create or update StripeEvent record
    await prisma.stripeEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        type: event.type,
        status: 'PENDING',
      },
      update: {
        type: event.type,
      },
    })

    // Process event
    try {
      await processStripeEvent(event, stripe)
      
      // Mark as processed
      await prisma.stripeEvent.update({
        where: { id: event.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      })
    } catch (error: any) {
      console.error(`Error processing Stripe event ${event.id}:`, error)
      
      // Mark as failed
      await prisma.stripeEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Unknown error',
        },
      })

      // Still return 200 to Stripe (we don't want retries for processing errors)
      // But log the error
      return NextResponse.json({ received: true, status: 'processed_with_errors', error: error.message })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function processStripeEvent(event: Stripe.Event, stripe: Stripe) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      
      if (session.mode !== 'subscription' || !session.subscription) {
        // Not a subscription checkout, skip
        return
      }

      // Get subscription to find price ID
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = subscription.items.data[0]?.price.id
      
      if (!priceId) {
        throw new Error('No price ID found in subscription')
      }

      const plan = getPlanForPriceId(priceId)
      if (!plan) {
        throw new Error(`Unknown price ID: ${priceId}`)
      }

      // Find organization via customer ID or metadata
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      const orgId = session.metadata?.orgId

      if (!customerId) {
        throw new Error('No customer ID in checkout session')
      }

      let org = null
      if (orgId) {
        org = await prisma.organization.findUnique({ where: { id: orgId } })
      }
      if (!org) {
        org = await prisma.organization.findFirst({ where: { stripeCustomerId: customerId } })
      }

      if (!org) {
        throw new Error(`Organization not found for customer ${customerId}`)
      }

      // Update organization
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
          trialEndsAt: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
        },
      })

      // Update StripeEvent with orgId
      await prisma.stripeEvent.update({
        where: { id: event.id },
        data: { orgId: org.id },
      })

      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

      if (!customerId) {
        throw new Error('No customer ID in subscription')
      }

      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: customerId },
      })

      if (!org) {
        // Subscription for unknown customer - log but don't fail
        console.warn(`Subscription ${subscription.id} for unknown customer ${customerId}`)
        return
      }

      const priceId = subscription.items.data[0]?.price.id
      if (!priceId) {
        throw new Error('No price ID in subscription')
      }

      const plan = getPlanForPriceId(priceId)
      if (!plan) {
        throw new Error(`Unknown price ID: ${priceId}`)
      }

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          plan,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
          trialEndsAt: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : null,
        },
      })

      await prisma.stripeEvent.update({
        where: { id: event.id },
        data: { orgId: org.id },
      })

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

      if (!customerId) {
        throw new Error('No customer ID in subscription')
      }

      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: customerId },
      })

      if (!org) {
        console.warn(`Subscription deletion for unknown customer ${customerId}`)
        return
      }

      // Downgrade to STARTER and mark as canceled
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          plan: 'STARTER',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
          stripePriceId: null,
          cancelAtPeriodEnd: false,
          trialEndsAt: null,
          // Keep customer ID for potential re-subscription
        },
      })

      await prisma.stripeEvent.update({
        where: { id: event.id },
        data: { orgId: org.id },
      })

      break
    }

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

      if (!customerId || !subscriptionId) {
        // Not a subscription invoice
        return
      }

      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: customerId },
      })

      if (!org) {
        return
      }

      // Get subscription to update status
      const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        },
      })

      await prisma.stripeEvent.update({
        where: { id: event.id },
        data: { orgId: org.id },
      })

      break
    }

    default:
      // Unknown event type - log but don't fail
      console.log(`Unhandled Stripe event type: ${event.type}`)
  }
}
