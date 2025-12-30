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
// - Pooler (6543): ALWAYS requires CA certificate (Supabase pooler uses self-signed certs)
// - Direct (5432): Try with system CA first, but may need custom CA in some cases
// - If CA is configured via NODE_EXTRA_CA_CERTS, use strict validation
// - Otherwise, for direct connections, try with system CA (may work)
const sslConfig: any = isCloudEnvironment
  ? (() => {
      // Pooler connections ALWAYS need CA
      if (isPoolerConnection && !hasCaConfigured) {
        console.error(
          '[Prisma] Pooler connection (6543) detected but SUPABASE_DB_CA_PEM not configured. ' +
          'Pooler connections require CA certificate. Please set SUPABASE_DB_CA_PEM in Vercel environment variables.'
        )
        // Still try, but will likely fail with P1011
        return { rejectUnauthorized: true }
      }

      // Direct connections: use strict validation if CA is configured
      // Otherwise, try with system CA (may work for direct connections)
      if (isDirectConnection && !hasCaConfigured) {
        console.warn(
          '[Prisma] Direct connection (5432) detected without CA. ' +
          'Using system CA certificates. If you get P1011 error, set SUPABASE_DB_CA_PEM.'
        )
        // Try with system CA first (may work)
        return { rejectUnauthorized: true }
      }

      // CA is configured, use strict validation
      return { rejectUnauthorized: true }
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

