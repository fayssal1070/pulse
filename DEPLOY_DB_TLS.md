# Database TLS Configuration for Vercel Deployment

## Problem: Prisma P1011 "self-signed certificate in certificate chain"

When deploying to Vercel with Supabase PostgreSQL, you may encounter:
```
Error [PrismaClientKnownRequestError]: P1011
Error opening a TLS connection: self-signed certificate in certificate chain
```

**Important:** `NODE_TLS_REJECT_UNAUTHORIZED=0` does NOT fix Prisma errors. Prisma uses its own SSL configuration and ignores this environment variable.

## Solution: Proper URL Configuration with SSL Parameters

### Required Environment Variables in Vercel

Set these in **Vercel Dashboard → Project Settings → Environment Variables**:

#### Option 1: Pooler Connection (Recommended for Production)

```bash
# Runtime connection (transaction pooler, port 6543)
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&sslcert=

# Migrations connection (direct, port 5432)
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require

# CA certificate for pooler (required)
SUPABASE_DB_CA_PEM=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
```

#### Option 2: Direct Connection (Simpler, No CA Required)

```bash
# Runtime connection (direct, port 5432)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require

# Migrations connection (same as DATABASE_URL)
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
```

**Note:** Direct connections work with system CA certificates and don't require `SUPABASE_DB_CA_PEM`.

### URL Format Requirements

#### For Pooler (Port 6543)
- **Format:** `postgresql://postgres.[PROJECT]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`
- **Required params:** `sslmode=require`, `pgbouncer=true`
- **CA certificate:** Must set `SUPABASE_DB_CA_PEM` (download from Supabase dashboard)

#### For Direct (Port 5432)
- **Format:** `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require`
- **Required params:** `sslmode=require`
- **CA certificate:** Not required (uses system CA)

### Forbidden Parameters

**❌ NEVER USE:**
- `sslaccept=accept_invalid_certs` - Deprecated, insecure, causes P1011
- `NODE_TLS_REJECT_UNAUTHORIZED=0` - Does NOT fix Prisma errors
- `sslmode=disable` - Disables SSL entirely (security risk)

### Prisma Configuration

The `prisma.config.ts` file is already configured correctly:
- Uses `DIRECT_URL` if present, otherwise falls back to `DATABASE_URL`
- This ensures migrations use the direct connection (port 5432)

**Do NOT add `directUrl` to `schema.prisma`** - Prisma 7.2 uses `prisma.config.ts` instead.

## Deployment Procedure

### 1. Set Environment Variables in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add/update:
   - `DATABASE_URL` (with `sslmode=require`)
   - `DIRECT_URL` (with `sslmode=require`)
   - `SUPABASE_DB_CA_PEM` (only if using pooler)
3. Apply to **Production**, **Preview**, and **Development** environments

### 2. Redeploy with Clear Cache

1. Go to **Vercel Dashboard** → Your Project → **Deployments**
2. Click **"..."** on the latest deployment → **"Redeploy"**
3. **Check "Clear Build Cache"** ✅
4. Click **"Redeploy"**

### 3. Verify Connection

After deployment, test the connection:

**Admin endpoint:**
```
https://your-app.vercel.app/api/debug/db-connection
```

**Or public endpoint (no auth):**
```
https://your-app.vercel.app/api/debug/db-public?secret=debug-tls-2024
```

**Expected response:**
```json
{
  "ok": true,
  "latencyMs": 45,
  "connectionInfo": {
    "databaseUrl": {
      "host": "aws-1-eu-west-1.pooler.supabase.com",
      "port": "6543"
    }
  }
}
```

### 4. Check Admin Debug Page

Navigate to `/admin/debug` (admin only) to see:
- Connection status (OK/KO)
- Host and port for `DATABASE_URL` and `DIRECT_URL`
- Latency
- Error details if connection fails

## Troubleshooting

### Still Getting P1011?

1. **Verify URLs:** Check that both `DATABASE_URL` and `DIRECT_URL` have `sslmode=require`
2. **Check CA Certificate:** If using pooler, verify `SUPABASE_DB_CA_PEM` is correctly set
3. **Clear Cache:** Redeploy with "Clear Build Cache" enabled
4. **Check Logs:** Look for `[Prisma] ✅ CA certificate loaded` in Vercel logs
5. **Try Direct Connection:** Switch to direct (port 5432) to bypass CA issues

### Connection Works But Slow?

- Pooler (6543) provides connection pooling but requires CA certificate
- Direct (5432) is simpler but no pooling (Prisma handles this internally)
- For most apps, direct connection is sufficient

### Migrations Fail?

- Ensure `DIRECT_URL` is set and uses port 5432 (direct connection)
- Migrations cannot use pooler (6543) - must use direct connection

## Additional Resources

- `VERCEL_DB_TLS_FIX.md` - Detailed TLS configuration guide
- `SUPABASE_CA_CERTIFICATE.md` - How to download Supabase CA certificate
- `FIX_POOLER_CERTIFICATE.md` - Troubleshooting pooler certificate issues
- `/admin/debug` - Admin debug page to verify connection

