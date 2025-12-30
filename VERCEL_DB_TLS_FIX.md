# Vercel Database TLS Fix - Supabase Prisma Connection

## Problem

**Error:** `P1011: Error opening a TLS connection: self-signed certificate in certificate chain`

This occurs when Prisma tries to connect to Supabase PostgreSQL without proper TLS certificate validation.

## Root Cause

Supabase uses different connection types:
- **Pooler (port 6543)**: Transaction pooler, requires custom CA certificate
- **Direct (port 5432)**: Direct PostgreSQL connection, usually works with system CA

## Solution: Proper URL Configuration

### Required Environment Variables

Set these in **Vercel Dashboard → Project Settings → Environment Variables**:

```bash
# For runtime queries (can be pooler or direct)
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true

# For migrations (MUST be direct connection)
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require

# CA certificate for pooler (required if using pooler for DATABASE_URL)
SUPABASE_DB_CA_PEM=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
```

### URL Format Requirements

#### DATABASE_URL (Runtime)
- **Pooler format:** `postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`
- **Direct format:** `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require`
- **Required params:** `sslmode=require`
- **If pooler:** Also add `pgbouncer=true`

#### DIRECT_URL (Migrations)
- **MUST be direct:** `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require`
- **Required params:** `sslmode=require`
- **Never use pooler (6543) for migrations**

### Forbidden Parameters

**❌ NEVER USE:**
- `sslaccept=accept_invalid_certs` - Deprecated, insecure, causes P1011
- `NODE_TLS_REJECT_UNAUTHORIZED=0` - Disables all TLS validation
- `sslmode=disable` - Disables SSL entirely
- `rejectUnauthorized: false` in code - Same as NODE_TLS_REJECT_UNAUTHORIZED=0

**✅ ALWAYS USE:**
- `sslmode=require` - Requires SSL with proper certificate validation
- `pgbouncer=true` - Required for pooler connections (port 6543)

## CA Certificate Setup (Pooler Only)

If using **pooler (6543)** for `DATABASE_URL`, you **must** provide the Supabase CA certificate:

1. **Get CA Certificate:**
   - Supabase Dashboard → Project Settings → Database → Connection Pooling → CA Certificate
   - Or: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

2. **Add to Vercel:**
   - Variable: `SUPABASE_DB_CA_PEM`
   - Value: Certificate as **single line** with `\n` for newlines:
     ```
     -----BEGIN CERTIFICATE-----\nMIIDXDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQELBQAwazELMAkGA1UEBhMCVVMXEDAOBgNVBAgMB0R1bHdhcmUxEzARBgNVBAcMCk51dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXN1IEluYzEeMBwGA1UEAwwVU3VwYWJhc2UgUm9vdCAyMDIXIENB...\n-----END CERTIFICATE-----
     ```

3. **How it works:**
   - `instrumentation.ts` runs at server startup
   - Writes CA to `/tmp/supabase-ca.pem`
   - Sets `NODE_EXTRA_CA_CERTS` environment variable
   - Node.js uses this CA for TLS validation

## Recommended Configuration

### Option 1: Direct Connection (Simplest)

**Best for:** Most use cases, simpler setup

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
```

**Advantages:**
- No CA certificate needed
- Works with system CA certificates
- Better for migrations
- More reliable

### Option 2: Pooler for Runtime, Direct for Migrations

**Best for:** High concurrency, many short-lived connections

```bash
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
SUPABASE_DB_CA_PEM=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
```

**Advantages:**
- Better connection pooling for runtime
- Direct connection for migrations (no CA needed)
- Scales better under load

## Verification

### 1. Test Connection (Public Endpoint - No Login Required)

**⚠️ IMPORTANT: Use this endpoint when you can't log in due to auth failures**

Navigate directly in your browser:
```
https://pulse-sigma-eight.vercel.app/api/debug/db-public?secret=debug-tls-2024
```

**Or using curl:**
```bash
curl "https://pulse-sigma-eight.vercel.app/api/debug/db-public?secret=debug-tls-2024"
```

**Note:** The secret `debug-tls-2024` is the default. You can set `DEBUG_DB_SECRET` in Vercel to customize it.

**Expected response:**
```json
{
  "ok": true,
  "latencyMs": 45,
  "db": {
    "host": "db.project.supabase.co",
    "port": "5432",
    "dbname": "postgres",
    "connectionType": "direct",
    "hasCredentials": true,
    "hasCa": false,
    "urlMasked": "postgresql://***:***@db.project.supabase.co:5432/postgres?sslmode=require"
  },
  "directUrl": {
    "host": "db.project.supabase.co",
    "port": "5432",
    "isDifferent": false
  }
}
```

### 2. Check Vercel Logs

After deployment, look for:
```
[Instrumentation] ✅ Supabase CA certificate configured: /tmp/supabase-ca.pem
[Prisma] Direct connection (5432) detected without CA. Using system CA certificates.
```

### 3. Verify No TLS Bypass

**Check for:**
- ❌ No `NODE_TLS_REJECT_UNAUTHORIZED` in Vercel environment variables
- ❌ No `sslaccept=accept_invalid_certs` in connection strings
- ❌ No `rejectUnauthorized: false` in code
- ✅ `sslmode=require` in all connection strings
- ✅ `rejectUnauthorized: true` in Prisma SSL config

## Troubleshooting

### Error: P1011 (self-signed certificate)

**If using pooler (6543):**
- Verify `SUPABASE_DB_CA_PEM` is set in Vercel
- Check certificate format (single line with `\n`)
- Verify logs show: `[Instrumentation] ✅ Supabase CA certificate configured`

**If using direct (5432):**
- Try setting `SUPABASE_DB_CA_PEM` (some Supabase projects require it)
- Or switch to pooler with CA certificate

### Error: P1001 (Can't reach database)

- Verify connection string format
- Check Supabase project is active
- Verify IP allowlist (if enabled) includes Vercel IPs
- Try direct connection instead of pooler

### Error: P1000 (Authentication failed)

- Regenerate database password in Supabase
- Update `DATABASE_URL` and `DIRECT_URL` in Vercel
- Verify password is correct (no special characters need encoding)

## Code Configuration

### Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  // url and directUrl are set via environment variables
  // Prisma 7 uses prisma.config.ts for datasource configuration
}
```

### Prisma Config (prisma.config.ts)

```typescript
export default defineConfig({
  datasource: {
    // DIRECT_URL for migrations, DATABASE_URL for runtime
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
```

### Runtime Prisma Client (lib/prisma.ts)

- Uses `DATABASE_URL` via `pg.Pool`
- SSL configured with `rejectUnauthorized: true`
- CA certificate loaded via `NODE_EXTRA_CA_CERTS` (set by instrumentation.ts)

## Summary

1. **Use `sslmode=require`** in all connection strings
2. **Never use** `sslaccept=accept_invalid_certs` or `NODE_TLS_REJECT_UNAUTHORIZED=0`
3. **Pooler (6543)** requires `SUPABASE_DB_CA_PEM`
4. **Direct (5432)** usually works without CA, but may need it in some cases
5. **DIRECT_URL** should always be direct (5432) for migrations
6. **DATABASE_URL** can be pooler (6543) or direct (5432) for runtime

## References

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma SSL Configuration](https://www.prisma.io/docs/concepts/database-connectors/postgresql#connection-details)
- [Node.js TLS Certificates](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)

