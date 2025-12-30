# Vercel IPv6 Fix - Supabase Connection

## Problem

**Vercel doesn't support IPv6**, but Supabase direct connection (port 5432) uses IPv6 by default. This causes:
- P1001: "Can't reach database server" when trying to connect to port 5432 from Vercel
- Authentication fails because Prisma can't connect to the database

## Root Cause

- **Pooler (port 6543)**: Uses IPv4 ✅ Accessible from Vercel
- **Direct (port 5432)**: Uses IPv6 ❌ NOT accessible from Vercel

## Solution: Use Pooler for Everything

Since Vercel can't access IPv6, you **MUST** use the pooler (port 6543) for both runtime queries and migrations.

### Vercel Environment Variables

Set both `DATABASE_URL` and `DIRECT_URL` to use the **pooler (port 6543)**:

```bash
# Runtime queries (transaction pooler)
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1

# Migrations (also use pooler since Vercel can't access IPv6 direct connection)
DIRECT_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

**IMPORTANT:** 
- ❌ **NE PAS utiliser** `db.xxxxx.supabase.co:6543` - cette URL directe n'expose pas le pooler
- ✅ **Utiliser** `aws-1-eu-west-1.pooler.supabase.com:6543` pour les deux URLs
- ✅ **Ajouter** `sslmode=require` pour la sécurité TLS

**Important:** Both URLs use port **6543** (pooler), not 5432 (direct).

### Why This Works

- Pooler uses IPv4, which Vercel supports ✅
- Pooler works for both runtime queries and migrations ✅
- No need to buy Supabase IPv4 addon ($4/month) ✅

### Prisma Configuration

**`prisma.config.ts`:**
```typescript
datasource: {
  // Use pooler for both queries and migrations (Vercel doesn't support IPv6)
  url: process.env["DATABASE_URL"], // Pooler 6543 (IPv4)
}
```

**`prisma/schema.prisma`:**
```prisma
datasource db {
  provider = "postgresql"
  // url and directUrl are in prisma.config.ts for Prisma 7.2
}
```

### Alternative: Buy Supabase IPv4 Addon

If you want to use direct connection (5432) for migrations:
1. Buy Supabase IPv4 addon ($4/month)
2. Get IPv4 address for direct connection
3. Set `DIRECT_URL` to IPv4 address (port 5432)
4. Keep `DATABASE_URL` as pooler (6543)

But for most use cases, **using pooler for both is simpler and free**.

## Verification

After setting both URLs to pooler (6543), test:
```
https://your-app.vercel.app/api/debug/db-public?secret=debug-tls-2024
```

Should return `"ok": true` with `"connectionType": "pooler"`.

