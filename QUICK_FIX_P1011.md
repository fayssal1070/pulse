# Quick Fix: P1011 Error (Self-signed certificate)

## Problem Detected

Your `DATABASE_URL` uses the **Pooler connection (port 6543)**, which **requires** a CA certificate.

The error you're seeing:
```
Error: P1011: Error opening a TLS connection: self-signed certificate in certificate chain
```

## Solution: Add Supabase CA Certificate

### Step 1: Get the Supabase CA Certificate

1. Go to: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
2. Download the CA certificate, OR
3. Copy from Supabase Dashboard → Project Settings → Database → Connection Pooling → CA Certificate

The certificate looks like:
```
-----BEGIN CERTIFICATE-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
... (many lines) ...
-----END CERTIFICATE-----
```

### Step 2: Add to Vercel Environment Variables

**⚠️ IMPORTANT: Vercel may not handle multiline values correctly. Use single-line format.**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add a new variable:
   - **Name:** `SUPABASE_DB_CA_PEM`
   - **Value:** Convert certificate to **single line** with `\n` for newlines

**How to convert:**
- Copy your certificate (multiline format)
- Replace every newline with `\n` (backslash + n)
- Or use this script: `node scripts/convert-cert-to-oneline.js < certificate.pem`

**Example format:**
```
-----BEGIN CERTIFICATE-----\nMIIDXDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQELBQAwazELMAkGA1UEBhMCVVMXEDAOBgNVBAgMB0R1bHdhcmUxEzARBgNVBAcMCk51dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXN1IEluYzEeMBwGA1UEAwwVU3VwYWJhc2UgUm9vdCAyMDIXIENBMB4XDTIxMDQyODEwNTY1M10XDTMxMDQyNjEwNTY1M1owazELMAkGA1UEBhMCVVMXEDAOBgNVBAgMB0R1bHdhcmUxEzARBgNVBAcMCk51dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXN1IEluYzEeMBwGA1UEAwwVU3VwYWJhc2UgUm9vdCAyMDIXIENB...\n-----END CERTIFICATE-----
```

**Important:** 
- The certificate must include `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`
- Use `\n` (backslash + n), NOT actual newlines
- It should be ONE continuous line

### Step 3: Redeploy

After adding the variable, trigger a new deployment (or wait for auto-deploy).

### Step 4: Verify

Check Vercel logs for:
```
[Instrumentation] ✅ Supabase CA certificate configured: /tmp/supabase-ca.pem
```

## Alternative: Switch to Direct Connection (Easier)

If you don't want to deal with CA certificates, **switch to direct connection**:

1. In Supabase Dashboard → Project Settings → Database
2. Copy the **Connection string** (NOT the Pooler connection)
3. Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require`
4. Update in Vercel:
   - `DATABASE_URL` = direct connection (port 5432)
   - `DIRECT_URL` = same direct connection

**Advantage:** Direct connections usually work without CA certificate.

## Verify Your Current Setup

After deployment, check `/api/debug/db` (admin only) to see:
- Connection type (pooler vs direct)
- Whether CA is configured
- Connection test result

