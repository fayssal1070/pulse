/**
 * Next.js Instrumentation Hook
 * Runs once at server startup, before Prisma is initialized
 * 
 * Purpose: Configure TLS CA certificates for Supabase/PostgreSQL connections
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const fs = await import('fs')
    const path = await import('path')
    const os = await import('os')

    const caPem = process.env.SUPABASE_DB_CA_PEM
    const dbUrl = process.env.DATABASE_URL || ''

    // Detect connection type for better logging
    const isPooler = dbUrl.includes(':6543') || dbUrl.includes('pooler.supabase.com')
    const isDirect = dbUrl.includes(':5432') || (dbUrl.includes('db.') && dbUrl.includes('.supabase.co'))

    if (caPem) {
      try {
        // Write CA to temp file
        const tempDir = os.tmpdir()
        const caPath = path.join(tempDir, 'supabase-ca.pem')

        // Ensure multiline PEM is properly formatted
        // Handle both \n (escaped) and actual newlines
        // Also handle if Vercel stores it as multiline (with actual newlines)
        let formattedPem = caPem
          .replace(/\\n/g, '\n')  // Replace escaped \n with actual newline
          .replace(/\r\n/g, '\n') // Replace Windows line endings
          .replace(/\r/g, '\n')   // Replace old Mac line endings
          .trim()                  // Remove leading/trailing whitespace

        // Validate PEM format
        if (!formattedPem.includes('-----BEGIN CERTIFICATE-----') || !formattedPem.includes('-----END CERTIFICATE-----')) {
          console.error('[Instrumentation] SUPABASE_DB_CA_PEM does not appear to be a valid PEM certificate')
          return
        }

        fs.writeFileSync(caPath, formattedPem, { mode: 0o644 })

        // Set NODE_EXTRA_CA_CERTS to include our CA
        process.env.NODE_EXTRA_CA_CERTS = caPath

        console.log('[Instrumentation] ✅ Supabase CA certificate configured:', caPath)
        if (isPooler) {
          console.log('[Instrumentation] ℹ️  Pooler connection detected - CA certificate is required')
        }
      } catch (error: any) {
        console.error('[Instrumentation] ❌ Failed to write CA certificate:', error.message)
        // Don't throw - allow app to continue, but connection may fail
      }
    } else {
      if (isPooler) {
        console.error(
          '[Instrumentation] ⚠️  Pooler connection (6543) detected but SUPABASE_DB_CA_PEM not set! ' +
          'Connection will likely fail with P1011. Please set SUPABASE_DB_CA_PEM in Vercel environment variables.'
        )
      } else if (isDirect) {
        console.log(
          '[Instrumentation] ℹ️  Direct connection (5432) detected without CA. ' +
          'Using system CA certificates. If you get P1011, set SUPABASE_DB_CA_PEM.'
        )
      } else {
        console.log('[Instrumentation] ℹ️  SUPABASE_DB_CA_PEM not set, using system CA certificates')
      }
    }
  }
}

