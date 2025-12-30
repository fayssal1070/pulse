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

    if (caPem) {
      try {
        // Write CA to temp file
        const tempDir = os.tmpdir()
        const caPath = path.join(tempDir, 'supabase-ca.pem')

        // Ensure multiline PEM is properly formatted
        const formattedPem = caPem.replace(/\\n/g, '\n')

        fs.writeFileSync(caPath, formattedPem, { mode: 0o644 })

        // Set NODE_EXTRA_CA_CERTS to include our CA
        process.env.NODE_EXTRA_CA_CERTS = caPath

        console.log('[Instrumentation] Supabase CA certificate configured:', caPath)
      } catch (error: any) {
        console.error('[Instrumentation] Failed to write CA certificate:', error.message)
        // Don't throw - allow app to continue, but connection may fail
      }
    } else {
      console.log('[Instrumentation] SUPABASE_DB_CA_PEM not set, using system CA certificates')
    }
  }
}

