/**
 * Encryption utilities for sensitive data (Telegram bot tokens)
 * Uses AES-GCM with key derived from AUTH_SECRET
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 16
const TAG_LENGTH = 16

/**
 * Derive encryption key from AUTH_SECRET
 */
function deriveKey(): Buffer {
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) {
    throw new Error('AUTH_SECRET environment variable is required for encryption')
  }

  // Use a constant salt for deterministic key derivation
  // In production, consider using INTEGRATIONS_ENC_KEY env var for better security
  const salt = process.env.INTEGRATIONS_ENC_KEY || 'pulse-integrations-enc-salt-v1'
  
  return pbkdf2Sync(authSecret, salt, 100000, KEY_LENGTH, 'sha256')
}

/**
 * Encrypt a value (e.g., Telegram bot token)
 */
export function encrypt(value: string): string {
  const key = deriveKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  // Format: iv:tag:encrypted (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a value
 */
export function decrypt(encryptedValue: string): string {
  const key = deriveKey()
  const parts = encryptedValue.split(':')
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format')
  }

  const [ivHex, tagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Get last 4 characters of a token (for display)
 */
export function getLast4(token: string): string {
  return token.length >= 4 ? token.slice(-4) : '****'
}

