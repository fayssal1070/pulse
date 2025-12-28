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

// Parse connection string to handle SSL
let connectionString = process.env.DATABASE_URL

// For Supabase and cloud PostgreSQL providers, ensure SSL is configured
// Add sslmode=require if not present (Supabase requires SSL)
try {
  const url = new URL(connectionString)
  if (!url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require')
    connectionString = url.toString()
  }
} catch (e) {
  // If URL parsing fails, connectionString might be in a different format
  // Try to append sslmode if it's not already there
  if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?'
    connectionString = `${connectionString}${separator}sslmode=require`
  }
}

// Configure SSL for PostgreSQL Pool (Supabase/cloud providers)
// rejectUnauthorized: false accepts self-signed certificates
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Accept self-signed certificates (common with Supabase)
  },
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

