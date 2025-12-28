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

// Configure SSL for PostgreSQL Pool (Supabase/cloud providers)
// rejectUnauthorized: false accepts self-signed certificates
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Accept self-signed certificates (common with Supabase)
  } : false, // No SSL in development (local PostgreSQL)
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

