/**
 * Webhook secret encryption utilities
 * Uses same encryption as AI provider keys
 */

import { encrypt, decrypt, getLast4 } from '@/lib/notifications/encryption'
import { createHash } from 'crypto'

/**
 * Encrypt webhook secret and return encrypted value + hash
 */
export function encryptWebhookSecret(plain: string): { secretEnc: string; secretHash: string } {
  if (!plain || plain.trim().length === 0) {
    throw new Error('Webhook secret cannot be empty')
  }

  const secretEnc = encrypt(plain)
  const secretHash = createHash('sha256').update(plain).digest('hex')

  return { secretEnc, secretHash }
}

/**
 * Decrypt webhook secret
 */
export function decryptWebhookSecret(secretEnc: string): string {
  if (!secretEnc || secretEnc.trim().length === 0) {
    throw new Error('Encrypted webhook secret cannot be empty')
  }

  return decrypt(secretEnc)
}

