import Stripe from 'stripe'

// Use a placeholder key for build time if not set
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

export const STRIPE_PRICE_IDS = {
  PRO: process.env.STRIPE_PRICE_ID_PRO || '',
  BUSINESS: process.env.STRIPE_PRICE_ID_BUSINESS || '',
}

