# Configuration Correcte Vercel Environment Variables

## URLs Correctes

### DATABASE_URL (Runtime queries)
```
postgresql://postgres.gxwhfheouydwaryuoagx:souad-admante-1990@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
```

### DIRECT_URL (Migrations)
```
postgresql://postgres.gxwhfheouydwaryuoagx:souad-admante-1990@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

## Points Importants

1. **Les deux URLs utilisent le pooler** (`aws-1-eu-west-1.pooler.supabase.com:6543`)
   - Vercel ne supporte pas IPv6
   - La connexion directe (`db.xxxxx.supabase.co:5432`) ne fonctionne pas depuis Vercel

2. **`sslmode=require` est obligatoire** pour la sécurité TLS

3. **`pgbouncer=true` est requis** pour le pooler (port 6543)

4. **`connection_limit=1`** est optionnel mais recommandé pour le pooler

## Pourquoi pas `db.xxxxx.supabase.co:6543` ?

L'URL `db.gxwhfheouydwaryuoagx.supabase.co` est l'adresse de la connexion **directe** (port 5432, IPv6). Elle n'expose **pas** le pooler sur le port 6543. Le pooler est uniquement accessible via `aws-1-eu-west-1.pooler.supabase.com:6543`.

