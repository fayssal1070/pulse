/**
 * Stripe client singleton
 * Fail-safe: returns null if Stripe not configured
 */

import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripeClient(): Stripe | null {
  if (stripeInstance) {
    return stripeInstance
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    console.warn('STRIPE_SECRET_KEY not configured. Stripe features disabled.')
    return null
  }

  try {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
    return stripeInstance
  } catch (error) {
    console.error('Failed to initialize Stripe client:', error)
    return null
  }
}

export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null
}

