# Supabase CA Certificate

## Problem

When connecting to Supabase via the **pooler** (port 6543), you may encounter:
```
Error opening a TLS connection: self-signed certificate in certificate chain
```

This is because Supabase uses a self-signed certificate for the pooler connection.

## Solution: Download the Correct CA Certificate

### Method 1: Download from Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Look for **Connection pooling** → **Transaction mode** (port 6543)
6. There should be:
   - A **"Download CA certificate"** button/link, OR
   - Instructions to download the certificate
7. Download the `.pem` file
8. Copy its content to `SUPABASE_DB_CA_PEM` in Vercel

**Important:** The certificate is region-specific. Since you're using `aws-1-eu-west-1.pooler.supabase.com`, make sure you download the certificate for **EU West 1** region.

### Method 2: Download via Supabase CLI

```bash
supabase projects api-keys list --project-ref YOUR_PROJECT_REF
```

### Method 3: Extract from Connection String (if provided)

Some Supabase connection strings include the certificate. Check your Supabase dashboard for the full connection string with SSL parameters.

### Method 4: Use Direct Connection (Alternative)

If you cannot get the pooler CA certificate, you can use the **direct connection** (port 5432) instead:

1. In Vercel, set `DATABASE_URL` to use port **5432** (direct connection)
2. Direct connections usually work with system CA certificates
3. Note: Direct connections don't support connection pooling

**Example direct URL:**
```
postgresql://user:password@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

## Setting the Certificate in Vercel

Once you have the CA certificate:

1. **Option A: Multiline (if supported)**
   - Copy the entire PEM certificate (including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`)
   - Paste into Vercel environment variable `SUPABASE_DB_CA_PEM`

2. **Option B: Single line with `\n`**
   - Convert newlines to `\n` (use the script: `node scripts/convert-cert-to-oneline.js`)
   - Paste into Vercel environment variable `SUPABASE_DB_CA_PEM`

## Verification

After setting `SUPABASE_DB_CA_PEM`, test the connection:

```
https://your-app.vercel.app/api/debug/db-public?secret=debug-tls-2024
```

Expected response:
```json
{
  "ok": true,
  "caFileExists": true,
  "caFileSize": 1234
}
```

## Important Notes

- **Pooler (6543)**: Requires custom CA certificate (`SUPABASE_DB_CA_PEM`)
- **Direct (5432)**: Usually works with system CA certificates
- The certificate is automatically loaded by `instrumentation.ts` and passed to Prisma
- Never use `NODE_TLS_REJECT_UNAUTHORIZED=0` or `rejectUnauthorized: false` (security risk)

## Troubleshooting

If you still get P1011 after setting the certificate:

1. Verify the certificate is valid PEM format
2. Check Vercel logs for `[Instrumentation] ✅ Supabase CA certificate configured`
3. Check Vercel logs for `[Prisma] ✅ CA certificate loaded from: /tmp/supabase-ca.pem`
4. Verify `caFileExists: true` in the debug endpoint response
5. Ensure the certificate matches your Supabase project region (e.g., `eu-west-1`)

