# Fix Pooler Certificate (P1011 → P2010)

## Current Situation

- ✅ Pooler (6543) is accessible from Vercel
- ❌ But getting P1011: "self-signed certificate in certificate chain"
- ❌ Direct (5432) gives P2010: "Can't reach database server" (network restrictions)

## Solution: Download Correct CA Certificate from Supabase

The certificate in `SUPABASE_DB_CA_PEM` is likely incorrect or outdated. You need to download the correct certificate from your Supabase project.

### Step 1: Get Certificate from Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Settings** → **Database**
3. Scroll to **Connection string** section
4. Look for **Connection pooling** → **Transaction mode** (port 6543)
5. There should be a **"Download CA certificate"** link or button
6. Download the `.pem` file

### Step 2: Alternative - Extract from Connection String

If Supabase provides a connection string with SSL parameters, the certificate might be embedded. Check:
- Connection string examples in Supabase dashboard
- Supabase documentation for your region (e.g., `eu-west-1`)

### Step 3: Update Vercel Environment Variable

1. Open the downloaded `.pem` file
2. Copy the entire content (including `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`)
3. In Vercel:
   - Go to **Project Settings** → **Environment Variables**
   - Find `SUPABASE_DB_CA_PEM`
   - **Option A**: Paste multiline (if Vercel supports it)
   - **Option B**: Convert to single line with `\n`:
     ```bash
     node scripts/convert-cert-to-oneline.js < certificate.pem
     ```
   - Paste the result

### Step 4: Verify DATABASE_URL

Ensure `DATABASE_URL` uses the pooler (port 6543):
```
postgresql://postgres.[PROJECT]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

### Step 5: Redeploy and Test

1. Redeploy on Vercel
2. Test: `https://pulse-sigma-eight.vercel.app/api/debug/db-public?secret=debug-tls-2024`
3. Expected: `"ok": true` with `"connectionType": "pooler"`

## If Certificate Still Doesn't Work

1. Check Vercel logs for `[Prisma] ✅ CA certificate loaded`
2. Verify certificate format (must include BEGIN/END markers)
3. Try downloading certificate again (Supabase may have updated it)
4. Contact Supabase support for region-specific certificate

