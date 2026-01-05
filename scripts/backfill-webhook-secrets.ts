/**
 * Backfill script to encrypt existing webhook secrets
 * Run this after migrating to secretEnc/secretHash columns
 * 
 * Usage: npx tsx scripts/backfill-webhook-secrets.ts
 */

import { prisma } from '../lib/prisma'
import { encryptWebhookSecret } from '../lib/webhooks/crypto'

async function backfillWebhookSecrets() {
  console.log('Starting webhook secrets backfill...')

  // Find all webhooks with old secret column but no secretEnc
  const webhooks = await prisma.$queryRaw<Array<{ id: string; secret: string }>>`
    SELECT id, secret 
    FROM "OrgWebhook" 
    WHERE "secretEnc" IS NULL 
    AND secret IS NOT NULL 
    AND secret != ''
  `

  console.log(`Found ${webhooks.length} webhooks to migrate`)

  for (const webhook of webhooks) {
    try {
      const { secretEnc, secretHash } = encryptWebhookSecret(webhook.secret)

      await prisma.$executeRaw`
        UPDATE "OrgWebhook"
        SET "secretEnc" = ${secretEnc}, "secretHash" = ${secretHash}
        WHERE id = ${webhook.id}
      `

      console.log(`✓ Migrated webhook ${webhook.id}`)
    } catch (error: any) {
      console.error(`✗ Failed to migrate webhook ${webhook.id}:`, error.message)
    }
  }

  console.log('Backfill complete!')
}

backfillWebhookSecrets()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

