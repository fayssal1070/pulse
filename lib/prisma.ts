import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined
}

// Pool PostgreSQL basé sur DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Use original connection string - don't modify it
// SSL should be configured in the connection string itself (e.g., ?sslmode=require)
// or via environment variables
const connectionString = process.env.DATABASE_URL

// Determine if we're in a cloud/production environment
// Vercel sets VERCEL_ENV, Supabase requires SSL
const isCloudEnvironment = 
  process.env.VERCEL_ENV === 'production' || 
  process.env.VERCEL_ENV === 'preview' ||
  process.env.NODE_ENV === 'production' ||
  connectionString.includes('supabase.co') ||
  connectionString.includes('amazonaws.com') ||
  connectionString.includes('azure.com')

// Detect connection type: pooler (6543) vs direct (5432)
const isPoolerConnection = connectionString.includes(':6543') || connectionString.includes('pooler.supabase.com')
const isDirectConnection = connectionString.includes(':5432') || connectionString.includes('db.') && connectionString.includes('.supabase.co')

// Check if CA is configured (via instrumentation.ts setting NODE_EXTRA_CA_CERTS)
const hasCaConfigured = !!process.env.NODE_EXTRA_CA_CERTS || !!process.env.SUPABASE_DB_CA_PEM

// Configure SSL for PostgreSQL Pool
// Strategy:
// - Always use strict TLS validation (rejectUnauthorized: true)
// - Pooler (6543): Requires CA certificate via SUPABASE_DB_CA_PEM
// - Direct (5432): Usually works with system CA, but may need custom CA
// - CA certificate is loaded by instrumentation.ts and set via NODE_EXTRA_CA_CERTS
// - We also read it directly here to pass to pg.Pool explicitly
const sslConfig: any = isCloudEnvironment
  ? (() => {
      // Always use strict validation - no TLS bypass
      const config: any = {
        rejectUnauthorized: true, // Strict TLS validation (CA must be valid)
      }

      // Read CA certificate from file if available (set by instrumentation.ts)
      const caPath = process.env.NODE_EXTRA_CA_CERTS
      if (caPath) {
        try {
          const fs = require('fs')
          if (fs.existsSync(caPath)) {
            const caCert = fs.readFileSync(caPath, 'utf8')
            config.ca = caCert
            console.log('[Prisma] ✅ CA certificate loaded from:', caPath)
          }
        } catch (error: any) {
          console.warn('[Prisma] ⚠️  Could not read CA certificate from', caPath, ':', error.message)
        }
      }

      // Log connection type and CA status for debugging
      if (isPoolerConnection) {
        if (!hasCaConfigured) {
          console.error(
            '[Prisma] ⚠️  Pooler connection (6543) detected but SUPABASE_DB_CA_PEM not configured. ' +
            'Pooler connections require CA certificate. Connection will fail with P1011. ' +
            'Please set SUPABASE_DB_CA_PEM in Vercel environment variables.'
          )
        } else {
          console.log('[Prisma] ✅ Pooler connection (6543) with CA certificate configured')
        }
      } else if (isDirectConnection) {
        if (!hasCaConfigured) {
          console.log(
            '[Prisma] ℹ️  Direct connection (5432) using system CA certificates. ' +
            'If you get P1011, set SUPABASE_DB_CA_PEM.'
          )
        } else {
          console.log('[Prisma] ✅ Direct connection (5432) with CA certificate configured')
        }
      }

      return config
    })()
  : false // No SSL in local development

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

