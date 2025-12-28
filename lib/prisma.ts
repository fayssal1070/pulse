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
const connectionString = process.env.DATABASE_URL
const url = new URL(connectionString)

// Configure SSL for PostgreSQL (Supabase/cloud providers)
// If connection string already has sslmode, use it; otherwise add require
const sslConfig: any = {
  rejectUnauthorized: false, // Accept self-signed certificates (common with Supabase)
}

// If DATABASE_URL has sslmode parameter, respect it
if (!url.searchParams.has('sslmode')) {
  url.searchParams.set('sslmode', 'require')
}

const pool = new Pool({
  connectionString: url.toString(),
  ssl: sslConfig,
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

