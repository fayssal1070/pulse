/**
 * Encryption utilities for AI provider API keys
 * Reuses encryption logic from lib/notifications/encryption.ts
 */

import { encrypt, decrypt, getLast4 as getLast4Helper } from '@/lib/notifications/encryption'

/**
 * Encrypt an API key and return ciphertext + last 4 chars
 */
export function encryptSecret(plain: string): { ciphertext: string; last4: string } {
  if (!plain || plain.trim().length === 0) {
    throw new Error('API key cannot be empty')
  }

  const ciphertext = encrypt(plain)
  const last4 = getLast4Helper(plain)

  return { ciphertext, last4 }
}

/**
 * Decrypt an encrypted API key
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext || ciphertext.trim().length === 0) {
    throw new Error('Encrypted API key cannot be empty')
  }

  return decrypt(ciphertext)
}

/**
 * Get last 4 characters for display
 */
export function getLast4(value: string): string {
  return getLast4Helper(value)
}

