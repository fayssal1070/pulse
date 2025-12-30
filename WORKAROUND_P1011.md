# Workaround P1011: SSL No-Verify Mode

## Problem

After many attempts, neither pooler (6543) nor direct (5432) connections work with proper SSL certificate validation. The P1011 error persists.

## Temporary Workaround: SSL No-Verify Mode

This is a **temporary workaround** that disables SSL certificate verification. It's less secure but may be the only way to get your app working right now.

### Option 1: Add Parameter to DATABASE_URL (Easiest)

In Vercel → Environment Variables → `DATABASE_URL`, add `sslmode=no-verify`:

**For Pooler:**
```
postgresql://postgres.[PROJECT]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true
```

**For Direct:**
```
postgresql://postgres:[PASSWORD]@db.gxwhfheouydwaryuoagx.supabase.co:5432/postgres?sslmode=no-verify
```

### Option 2: Use Environment Variable

Add to Vercel → Environment Variables:
```
DATABASE_SSL_NO_VERIFY=true
```

This will automatically configure Prisma to use `rejectUnauthorized: false`.

### After Setting

1. **Redeploy with Clear Cache**
2. **Test login** - should work now ✅

## Security Warning

⚠️ **This disables SSL certificate verification, making your connection vulnerable to man-in-the-middle attacks.**

**Only use this if:**
- You're in a trusted network (Supabase's network)
- You need a temporary fix while finding the correct CA certificate
- You understand the security implications

## Long-Term Solution

Once the app is working, you should:
1. Contact Supabase support to get the correct CA certificate for your region
2. Download the certificate from Supabase dashboard
3. Set `SUPABASE_DB_CA_PEM` correctly
4. Remove `sslmode=no-verify` and `DATABASE_SSL_NO_VERIFY`
5. Use proper SSL validation again

## Why This Works

- `sslmode=no-verify` tells PostgreSQL client to skip certificate validation
- `rejectUnauthorized: false` tells Node.js/pg to skip certificate validation
- This bypasses the P1011 error entirely

## Verification

After deployment, test:
```
https://pulse-sigma-eight.vercel.app/api/debug/db-public?secret=debug-tls-2024
```

Should return `"ok": true` even with no-verify mode.

