# Fix Immédiat P1011 - Solution de Contournement

## Erreur Actuelle

```
P1011: Error opening a TLS connection: self-signed certificate in certificate chain
```

Le pooler Supabase nécessite un certificat CA, mais il n'est pas correctement configuré.

## Solution Immédiate (2 minutes)

### Option 1: Ajouter `sslmode=no-verify` aux URLs (Recommandé)

Dans Vercel → Environment Variables, modifiez les deux URLs :

**DATABASE_URL:**
```
postgresql://postgres.gxwhfheouydwaryuoagx:souad-admante-1990@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true&connection_limit=1
```

**DIRECT_URL:**
```
postgresql://postgres.gxwhfheouydwaryuoagx:souad-admante-1990@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&pgbouncer=true
```

**Changement :** `sslmode=require` → `sslmode=no-verify`

### Option 2: Utiliser la Variable d'Environnement

Ajoutez dans Vercel :
```
DATABASE_SSL_NO_VERIFY=true
```

Cette variable active automatiquement `rejectUnauthorized: false` dans le code.

## Après Modification

1. **Redeploy avec Clear Cache** sur Vercel
2. **Testez la connexion** : `https://pulse-sigma-eight.vercel.app/api/debug/db-public?secret=debug-tls-2024`
3. **Testez l'authentification** - devrait fonctionner maintenant ✅

## Avertissement Sécurité

⚠️ `sslmode=no-verify` désactive la vérification du certificat SSL. C'est moins sécurisé mais fonctionne immédiatement.

**Pour la production, vous devriez :**
1. Télécharger le certificat CA depuis Supabase dashboard
2. Le configurer dans `SUPABASE_DB_CA_PEM`
3. Revenir à `sslmode=require`

Mais pour l'instant, `sslmode=no-verify` va débloquer votre application.

