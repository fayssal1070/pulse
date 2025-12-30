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

// Configure SSL for PostgreSQL Pool
// If SUPABASE_DB_CA_PEM is set, instrumentation.ts will configure NODE_EXTRA_CA_CERTS
// and we can use strict SSL validation. Otherwise, we rely on system CA certificates.
const sslConfig: any = isCloudEnvironment
  ? {
      // Use strict SSL validation if CA is provided via NODE_EXTRA_CA_CERTS
      // Otherwise, system CA certificates will be used
      rejectUnauthorized: true, // Always validate certificates (CA must be provided)
    }
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

