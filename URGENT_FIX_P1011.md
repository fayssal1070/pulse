# URGENT: Fix P1011 Authentication Error

## Current Situation

You're getting P1011 "self-signed certificate in certificate chain" during authentication, which prevents login.

## Immediate Solution: Switch to Direct Connection

The pooler connection (6543) requires a specific CA certificate that may not be correctly configured. **Switch to direct connection (5432) immediately.**

### Steps (5 minutes)

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. **Update `DATABASE_URL`** to use direct connection (port 5432):
   ```
   postgresql://postgres:[PASSWORD]@db.gxwhfheouydwaryuoagx.supabase.co:5432/postgres?sslmode=require
   ```
   Replace `[PASSWORD]` with your actual password.

3. **Update `DIRECT_URL`** (same as DATABASE_URL):
   ```
   postgresql://postgres:[PASSWORD]@db.gxwhfheouydwaryuoagx.supabase.co:5432/postgres?sslmode=require
   ```

4. **Keep or remove `SUPABASE_DB_CA_PEM`** (not needed for direct connection, but won't hurt)

5. **Redeploy with Clear Cache:**
   - Go to **Deployments** → Latest → **"..."** → **"Redeploy"**
   - ✅ Check **"Clear Build Cache"**
   - Click **"Redeploy"**

6. **Wait 2-3 minutes** for deployment

7. **Test login** - should work now ✅

## Why This Works

- **Direct connections (5432)** use standard PostgreSQL SSL certificates trusted by system CA stores
- **No custom CA certificate needed**
- Works immediately without certificate configuration

## After Fix: Verify Connection

Test the connection:
```
https://pulse-sigma-eight.vercel.app/api/debug/db-public?secret=debug-tls-2024
```

Expected:
```json
{
  "ok": true,
  "db": {
    "connectionType": "direct",
    "port": "5432"
  }
}
```

## If You Want to Use Pooler Later

1. Download the correct CA certificate from Supabase dashboard:
   - Settings → Database → Connection Pooling → Transaction mode → Download CA certificate
2. Set `SUPABASE_DB_CA_PEM` in Vercel
3. Switch `DATABASE_URL` back to pooler (6543)

But for now, **direct connection will fix your login issue immediately**.

