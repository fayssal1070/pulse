# Vercel + Supabase + Prisma: Configuration des URLs

Ce document explique comment configurer correctement les URLs de connexion Supabase pour Prisma dans un environnement Vercel.

## URLs requises

### 1. DATABASE_URL (obligatoire)

**Usage**: Pooler de transactions Supabase (recommandé pour Vercel serverless)

**Format**:
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

**Caractéristiques**:
- Port: **6543** (Transaction pooler)
- `sslmode=require` (obligatoire pour Supabase)
- **NE PAS utiliser** `sslaccept=accept_invalid_certs` (déprécié, peut causer P1011)
- Supporte les connexions serverless (Vercel Functions)

**Exemple**:
```
postgresql://postgres.abcdefghijklmnop:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### 2. DIRECT_URL (optionnel mais recommandé)

**Usage**: Pooler de sessions ou connexion directe (pour migrations Prisma)

**Format**:
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

**Caractéristiques**:
- Port: **5432** (Session pooler ou direct)
- `sslmode=require` (obligatoire)
- Utilisé par Prisma pour les migrations et certaines opérations
- **NE PAS utiliser** `sslaccept=accept_invalid_certs`

**Exemple**:
```
postgresql://postgres.abcdefghijklmnop:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

## Configuration dans Vercel

### Variables d'environnement

Dans le dashboard Vercel → Project → Settings → Environment Variables, ajouter :

1. **DATABASE_URL** (Production, Preview, Development) - **OBLIGATOIRE**
   - Valeur: URL avec port 6543 + `?sslmode=require`
   - Exemple: `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`
   - Utilisé par Prisma via `prisma.config.ts`

2. **DIRECT_URL** (Production, Preview, Development) - **OPTIONNEL**
   - Valeur: URL avec port 5432 + `?sslmode=require`
   - Exemple: `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require`
   - Note: Prisma 7 n'utilise pas `DIRECT_URL` automatiquement, mais peut être utile pour migrations manuelles

### Où trouver les URLs dans Supabase

1. Aller sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionner votre projet
3. Settings → Database
4. Section "Connection string" ou "Connection pooling"
5. Copier l'URL avec le bon port (6543 pour Transaction, 5432 pour Session)
6. Ajouter `?sslmode=require` si absent

## Erreurs courantes et solutions

### P1011: "self-signed certificate in certificate chain"

**Cause**: 
- Utilisation de `sslaccept=accept_invalid_certs` (déprécié)
- Absence de `sslmode=require`
- Configuration SSL incorrecte dans le Pool

**Solution**:
1. Vérifier que `DATABASE_URL` contient `?sslmode=require` (pas `sslaccept`)
2. Supprimer tout paramètre `sslaccept` de l'URL
3. Vérifier que `lib/prisma.ts` configure correctement SSL pour Supabase

### P1001: "Can't reach database server"

**Cause**:
- Mauvais host (ex: `db.[ref].supabase.co` au lieu de `aws-0-[region].pooler.supabase.com`)
- Mauvais port (ex: 5432 au lieu de 6543 pour le pooler transaction)
- Firewall/VPC bloquant la connexion
- URL malformée

**Solution**:
1. Vérifier que l'host est `aws-0-[region].pooler.supabase.com` (pas `db.[ref].supabase.co`)
2. Vérifier le port: **6543** pour DATABASE_URL (transaction pooler)
3. Vérifier que l'URL est complète et valide
4. Tester la connexion avec `/api/health/db`

### P1000: "Authentication failed"

**Cause**:
- Mot de passe incorrect
- Utilisateur inexistant
- Token expiré

**Solution**:
1. Régénérer le mot de passe dans Supabase Dashboard
2. Vérifier que l'utilisateur `postgres.[ref]` existe
3. Recopier l'URL complète depuis Supabase

## Vérification

### Healthcheck endpoint

Tester la connexion DB via:
```
GET https://[your-domain].vercel.app/api/health/db
```

**Réponse OK**:
```json
{
  "ok": true,
  "latencyMs": 45,
  "commitShaShort": "abc1234",
  "vercelEnv": "production",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Réponse erreur**:
```json
{
  "ok": false,
  "errorCode": "P1011",
  "message": "Error opening a TLS connection: self-signed certificate...",
  "hint": "TLS certificate issue - verify DATABASE_URL has sslmode=require (not sslaccept)",
  "latencyMs": 100,
  "commitShaShort": "abc1234",
  "vercelEnv": "production",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Checklist de dépannage

Si vous rencontrez P1011 ou P1001:

- [ ] Vérifier que `DATABASE_URL` utilise le port **6543** (transaction pooler)
- [ ] Vérifier que `DATABASE_URL` contient `?sslmode=require` (pas `sslaccept`)
- [ ] Vérifier que l'host est `aws-0-[region].pooler.supabase.com` (pas `db.[ref].supabase.co`)
- [ ] Vérifier que `DIRECT_URL` est configuré (port 5432) si utilisé par Prisma
- [ ] Tester `/api/health/db` pour diagnostiquer l'erreur exacte
- [ ] Vérifier que les variables d'environnement sont bien définies dans Vercel (Production + Preview)
- [ ] Vérifier que `lib/prisma.ts` détecte correctement Supabase et active SSL

## Références

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma PostgreSQL Connection](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

