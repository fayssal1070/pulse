# Staging Database Setup - Résumé

## ✅ 1. Forme correcte de DATABASE_URL

```
postgresql://postgres.gxwhfheouydwaryuoagx:Nordic-1987%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
```

**Points importants :**
- Mot de passe : `Nordic-1987%40` (sans crochets `[]`, le `@` est encodé en `%40`)
- Port : `6543` (connection pooler Supabase)
- Host : `aws-1-eu-west-1.pooler.supabase.com`

## ✅ 2. Configuration Vercel

**Guide complet :** Voir `VERCEL_DATABASE_SETUP.md`

**Résumé rapide :**
1. Vercel Dashboard → Projet `pulse` → Settings → Environment Variables
2. Ajouter `DATABASE_URL` avec la valeur ci-dessus
3. Cocher **Production** ET **Preview**
4. Redéployer (Deployments → ⋯ → Redeploy)

## ✅ 3. .env.local

La DATABASE_URL a été mise à jour dans `.env.local` localement.

## ✅ 4. Migration et Seed

- Migration : Utilisation de `prisma db push` (contourne le problème de prepared statement avec le pooler)
- Seed : Exécution de `node prisma/seed.js`

## ✅ 5. Credentials de test

Après le seed :
- **Email** : `owner@example.com`
- **Mot de passe** : `password123`

## 🔗 URLs de test

- Login : https://pulse-mt2fzivzg-pulses-projects-bcf85027.vercel.app/login
- Register : https://pulse-mt2fzivzg-pulses-projects-bcf85027.vercel.app/register


