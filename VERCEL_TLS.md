# Vercel TLS Configuration for PostgreSQL/Supabase

This document explains how to properly configure TLS connections to PostgreSQL databases (especially Supabase) on Vercel without using insecure workarounds.

## Problem

When connecting to Supabase PostgreSQL from Vercel, you may encounter:
```
Error: P1011: Error opening a TLS connection: self-signed certificate in certificate chain
```

## Solution: Use Direct Connection (Port 5432) - Recommended

**Use the direct connection URL from Supabase**, which typically uses port `5432`:

1. In Supabase Dashboard → Project Settings → Database
2. Copy the **Connection string** (not the Pooler connection)
3. Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require`

**Advantages:**
- Usually works with system CA certificates (no custom CA needed)
- Better for migrations and long-running queries
- More reliable connection
- Simpler configuration

**Vercel Environment Variables:**
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
```

**Note:** If you still get P1011 with direct connection, you may need to set `SUPABASE_DB_CA_PEM` (see Option 2).

### Option 2: Pooler Connection (Port 6543) with CA Certificate

If you must use the **Transaction Pooler** (port `6543`), you need to provide the Supabase CA certificate:

1. **Get the Supabase CA Certificate:**
   - Download from: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
   - Or use the certificate from Supabase Dashboard → Project Settings → Database → Connection Pooling

2. **Set Environment Variables in Vercel:**
   ```
   DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
   SUPABASE_DB_CA_PEM=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
   ```

   **Important:** For multiline PEM in Vercel:
   - Use `\n` to represent newlines
   - Or paste the entire certificate as a single line with `\n` separators
   - Example: `-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END CERTIFICATE-----`

3. **How it works:**
   - The `instrumentation.ts` hook runs at server startup
   - It writes `SUPABASE_DB_CA_PEM` to a temp file
   - Sets `NODE_EXTRA_CA_CERTS` to point to that file
   - Node.js will use this CA certificate for TLS validation

## Forbidden Configurations

### ❌ DO NOT USE:

1. **`NODE_TLS_REJECT_UNAUTHORIZED=0`**
   - This disables all TLS certificate validation
   - Makes connections vulnerable to man-in-the-middle attacks
   - **Never use this in production**

2. **`sslmode=disable`**
   - Disables SSL entirely
   - Data is transmitted in plain text
   - **Never use this in production**

3. **`?sslmode=require&sslaccept=accept_invalid_certs`**
   - Accepts invalid certificates
   - **Never use this in production**

4. **`rejectUnauthorized: false` in code**
   - Same as `NODE_TLS_REJECT_UNAUTHORIZED=0`
   - **Never use this in production**

## Verification

### Test Database Connection

Use the admin debug endpoint:

```bash
curl https://your-app.vercel.app/api/debug/db \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

Expected response:
```json
{
  "ok": true,
  "latencyMs": 45,
  "db": {
    "host": "db.project.supabase.co",
    "port": "5432",
    "dbname": "postgres",
    "hasCredentials": true,
    "hasCa": true
  },
  "hasExtraCa": true,
  "extraCaPath": "/tmp/supabase-ca.pem"
}
```

### Check Logs

In Vercel deployment logs, you should see:
```
[Instrumentation] Supabase CA certificate configured: /tmp/supabase-ca.pem
```

If `SUPABASE_DB_CA_PEM` is not set:
```
[Instrumentation] SUPABASE_DB_CA_PEM not set, using system CA certificates
```

## Troubleshooting

### Error: P1011 (self-signed certificate)

**Cause:** CA certificate not provided or invalid

**Solutions:**
1. Use direct connection (port 5432) instead of pooler
2. Set `SUPABASE_DB_CA_PEM` with the correct certificate
3. Verify certificate format (must include `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`)

### Error: P1001 (Can't reach database server)

**Cause:** Network/firewall issue or wrong connection string

**Solutions:**
1. Verify connection string is correct
2. Check Supabase project is active
3. Verify IP allowlist (if enabled) includes Vercel IPs
4. Try direct connection instead of pooler

### Error: P1000 (Authentication failed)

**Cause:** Wrong password or user

**Solutions:**
1. Regenerate database password in Supabase
2. Update `DATABASE_URL` and `DIRECT_URL` in Vercel
3. Verify connection string format

## Best Practices

1. **Always use direct connection (5432) for migrations**
   - Set `DIRECT_URL` to direct connection
   - Prisma Migrate uses `DIRECT_URL` automatically

2. **Use pooler (6543) only if needed for high concurrency**
   - Requires CA certificate configuration
   - More complex setup

3. **Never commit credentials**
   - Use Vercel Environment Variables
   - Rotate passwords regularly

4. **Monitor connection health**
   - Use `/api/debug/db` endpoint
   - Check Vercel logs for TLS errors

## References

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma SSL Configuration](https://www.prisma.io/docs/concepts/database-connectors/postgresql#connection-details)
- [Node.js TLS Certificates](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)

