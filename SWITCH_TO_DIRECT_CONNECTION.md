# Switch to Direct Connection (Fix P1011)

If you're getting P1011 errors with the pooler connection, **switch to direct connection** (port 5432).

## Quick Fix

### In Vercel Environment Variables:

1. **Update `DATABASE_URL`** to use port **5432** (direct connection):
   ```
   postgresql://user:password@db.gxwhfheouydwaryuoagx.supabase.co:5432/postgres?sslmode=require
   ```

2. **Update `DIRECT_URL`** (same as DATABASE_URL):
   ```
   postgresql://user:password@db.gxwhfheouydwaryuoagx.supabase.co:5432/postgres?sslmode=require
   ```

3. **Remove or ignore `SUPABASE_DB_CA_PEM`** (not needed for direct connection)

4. **Redeploy** your application

## Why This Works

- **Direct connections (5432)** use standard PostgreSQL SSL certificates that are trusted by system CA stores
- **Pooler connections (6543)** require a custom CA certificate that must be downloaded from Supabase
- Direct connections work out of the box without custom CA configuration

## After Switching

Test the connection:
```
https://pulse-sigma-eight.vercel.app/api/debug/db-public?secret=debug-tls-2024
```

Expected response:
```json
{
  "ok": true,
  "db": {
    "connectionType": "direct",
    "port": "5432"
  }
}
```

## Performance Note

Direct connections don't have connection pooling, but:
- Prisma Client manages its own connection pool
- For most applications, this is sufficient
- If you need pooling, you can set it up later with the correct Supabase CA certificate

