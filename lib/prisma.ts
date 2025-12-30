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
// - Try strict TLS validation first (rejectUnauthorized: true with CA)
// - If CA is not available or doesn't work, fall back to no-verify mode
// - This is a workaround for Supabase pooler certificate issues
const sslConfig: any = isCloudEnvironment
  ? (() => {
      const config: any = {}
      
      // Check if we should use no-verify mode (workaround for certificate issues)
      const useNoVerify = process.env.DATABASE_SSL_NO_VERIFY === 'true' || 
                          connectionString.includes('sslmode=no-verify')
      
      if (useNoVerify) {
        // Workaround mode: disable certificate verification
        // WARNING: This is less secure but may be necessary if CA certificate doesn't work
        config.rejectUnauthorized = false
        console.warn('[Prisma] ⚠️  SSL no-verify mode enabled (less secure but may fix P1011)')
        return config
      }
      
      // Normal mode: strict TLS validation
      config.rejectUnauthorized = true

      // Read CA certificate from file if available (set by instrumentation.ts)
      const caPath = process.env.NODE_EXTRA_CA_CERTS
      if (caPath) {
        try {
          const fs = require('fs')
          if (fs.existsSync(caPath)) {
            const caCert = fs.readFileSync(caPath, 'utf8')
            // Validate certificate format
            if (caCert.includes('-----BEGIN CERTIFICATE-----') && caCert.includes('-----END CERTIFICATE-----')) {
              config.ca = caCert
              const certLength = caCert.length
              const certLines = caCert.split('\n').length
              console.log(`[Prisma] ✅ CA certificate loaded from: ${caPath} (${certLength} chars, ${certLines} lines)`)
            } else {
              console.error('[Prisma] ❌ CA certificate file exists but does not contain valid PEM format')
            }
          } else {
            console.error(`[Prisma] ❌ CA certificate file not found at: ${caPath}`)
          }
        } catch (error: any) {
          console.error('[Prisma] ❌ Could not read CA certificate from', caPath, ':', error.message)
        }
      } else {
        // Try reading directly from SUPABASE_DB_CA_PEM if NODE_EXTRA_CA_CERTS not set
        const caPem = process.env.SUPABASE_DB_CA_PEM
        if (caPem) {
          try {
            // Format the PEM (handle escaped newlines)
            const formattedPem = caPem.replace(/\\n/g, '\n').trim()
            if (formattedPem.includes('-----BEGIN CERTIFICATE-----') && formattedPem.includes('-----END CERTIFICATE-----')) {
              config.ca = formattedPem
              console.log('[Prisma] ✅ CA certificate loaded directly from SUPABASE_DB_CA_PEM')
            } else {
              console.error('[Prisma] ❌ SUPABASE_DB_CA_PEM does not contain valid PEM format')
            }
          } catch (error: any) {
            console.error('[Prisma] ❌ Could not parse SUPABASE_DB_CA_PEM:', error.message)
          }
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

// Log SSL config (without exposing certificate content)
if (sslConfig && typeof sslConfig === 'object') {
  const hasCa = !!sslConfig.ca
  const caLength = sslConfig.ca ? String(sslConfig.ca).length : 0
  const caStartsWith = sslConfig.ca ? String(sslConfig.ca).substring(0, 30) : 'N/A'
  console.log(`[Prisma] SSL config: rejectUnauthorized=${sslConfig.rejectUnauthorized}, hasCA=${hasCa}, caLength=${caLength}, caStart="${caStartsWith}..."`)
  
  // Additional validation: ensure CA is a string (not array)
  if (hasCa && !Array.isArray(sslConfig.ca) && typeof sslConfig.ca !== 'string') {
    console.error('[Prisma] ❌ CA certificate is not a string or array:', typeof sslConfig.ca)
  }
}

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
})

// Test connection immediately to catch SSL errors early
pool.on('error', (err) => {
  console.error('[Prisma] Pool error:', err.message)
  if (err.message.includes('certificate') || err.message.includes('TLS')) {
    console.error('[Prisma] ⚠️  TLS/Certificate error detected. Check SUPABASE_DB_CA_PEM configuration.')
  }
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

