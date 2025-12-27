import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.orgId
        const plan = session.metadata?.plan

        if (!orgId || !plan) {
          console.error('Missing metadata in checkout.session.completed', { orgId, plan })
          break
        }

        // Get subscription from session
        const subscriptionId = session.subscription as string
        if (!subscriptionId) {
          console.error('No subscription ID in checkout session')
          break
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id

        // Update organization
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            plan: plan as 'PRO' | 'BUSINESS',
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
          },
        })

        console.log(`Updated org ${orgId} to plan ${plan}`)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

        // Find organization by customer ID
        const org = await prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
        })

        if (!org) {
          console.error(`Organization not found for customer ${customerId}`)
          break
        }

        const priceId = subscription.items.data[0]?.price.id
        const plan = priceId === STRIPE_PRICE_IDS.PRO ? 'PRO' : priceId === STRIPE_PRICE_IDS.BUSINESS ? 'BUSINESS' : 'FREE'

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            plan,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId || null,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
          },
        })

        console.log(`Updated org ${org.id} subscription: ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

        const org = await prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
        })

        if (!org) {
          console.error(`Organization not found for customer ${customerId}`)
          break
        }

        // Downgrade to FREE plan
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            plan: 'FREE',
            stripeSubscriptionId: null,
            stripePriceId: null,
            subscriptionStatus: 'canceled',
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
        })

        console.log(`Downgraded org ${org.id} to FREE plan`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.customer) {
          console.error('Invoice has no customer')
          break
        }
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id

        const org = await prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
        })

        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              subscriptionStatus: 'past_due',
            },
          })
          console.log(`Marked org ${org.id} as past_due`)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.customer) {
          console.error('Invoice has no customer')
          break
        }
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id

        const org = await prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
        })

        if (org && org.stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              subscriptionStatus: subscription.status,
              currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
            },
          })
          console.log(`Updated org ${org.id} subscription status to ${subscription.status}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// Disable body parsing for webhook route
export const runtime = 'nodejs'

