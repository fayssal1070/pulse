# Instructions pour appliquer la migration manquante

## Problème

La migration `20250201000000_add_ai_gateway_key_defaults_ratelimit` n'a pas été appliquée en production, causant l'erreur Prisma `P2022` (Column does not exist) sur `/admin/ai`.

## Solution 1: Via l'endpoint API Admin (Recommandé)

1. Se connecter en tant qu'admin
2. Appeler l'endpoint : `POST /api/admin/migrate`
3. La migration sera appliquée automatiquement

```bash
curl -X POST https://pulse-sigma-eight.vercel.app/api/admin/migrate \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## Solution 2: Via Supabase Dashboard

1. Accéder au Supabase Dashboard
2. Aller dans "SQL Editor"
3. Exécuter le contenu de `prisma/migrations/20250201000000_add_ai_gateway_key_defaults_ratelimit/migration.sql`

## Solution 3: Via Vercel CLI (si configuré)

```bash
vercel env pull
npx prisma migrate deploy
```

## Solution 4: Via ligne de commande locale

```bash
# Se connecter à la base de données de production
# Récupérer DATABASE_URL depuis les variables d'environnement Vercel

# Appliquer la migration
DATABASE_URL="YOUR_PROD_DATABASE_URL" npx prisma migrate deploy
```

## Migration à appliquer

**Fichier:** `prisma/migrations/20250201000000_add_ai_gateway_key_defaults_ratelimit/migration.sql`

**Changements:**
- Ajoute les colonnes `enabled`, `defaultAppId`, `defaultProjectId`, `defaultClientId`, `rateLimitRpm` à `AiGatewayKey`
- Crée la table `ApiKeyUsageWindow` pour le rate limiting
- Ajoute les indexes et foreign keys nécessaires

## Vérification après application

Vérifier que les colonnes existent :

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'AiGatewayKey' 
ORDER BY ordinal_position;
```

Les colonnes suivantes doivent être présentes :
- `enabled` (boolean, NOT NULL, default true)
- `defaultAppId` (text, nullable)
- `defaultProjectId` (text, nullable)
- `defaultClientId` (text, nullable)
- `rateLimitRpm` (integer, nullable)

## Note

L'erreur "prepared statement already exists" lors du build vient du fait que `prisma migrate deploy` ne peut pas être exécuté dans le script de build sur Vercel à cause du pooler Supabase. Les migrations doivent être appliquées manuellement ou via l'endpoint admin.

