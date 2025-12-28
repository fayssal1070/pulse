# Variables d'environnement Vercel - REQUISES

## Variables OBLIGATOIRES pour le build

### 1. DATABASE_URL (OBLIGATOIRE)
- **Description** : URL de connexion PostgreSQL pour Prisma
- **Format** : `postgresql://user:password@host:port/database?sslmode=require`
- **Où l'ajouter** : Vercel Dashboard → Project Settings → Environment Variables
- **Environnements** : Production, Preview, Development (tous)

### 2. AUTH_SECRET (OBLIGATOIRE pour NextAuth)
- **Description** : Secret pour signer les tokens JWT NextAuth
- **Format** : Chaîne aléatoire (générer avec `openssl rand -base64 32`)
- **Où l'ajouter** : Vercel Dashboard → Project Settings → Environment Variables
- **Environnements** : Production, Preview, Development (tous)

## Variables OPTIONNELLES (selon features utilisées)

### 3. STRIPE_SECRET_KEY (si Stripe activé)
- **Description** : Clé secrète Stripe pour les paiements
- **Format** : `sk_live_...` (production) ou `sk_test_...` (test)
- **Environnements** : Production uniquement

### 4. STRIPE_WEBHOOK_SECRET (si webhooks Stripe)
- **Description** : Secret pour valider les webhooks Stripe
- **Format** : `whsec_...`
- **Environnements** : Production uniquement

### 5. AWS_ACCESS_KEY_ID (si AWS Cost Explorer activé)
- **Description** : Clé d'accès AWS pour Cost Explorer
- **Environnements** : Production, Preview (selon besoin)

### 6. AWS_SECRET_ACCESS_KEY (si AWS Cost Explorer activé)
- **Description** : Secret AWS pour Cost Explorer
- **Environnements** : Production, Preview (selon besoin)

### 7. TELEGRAM_BOT_TOKEN (si notifications Telegram)
- **Description** : Token du bot Telegram
- **Environnements** : Production uniquement

## Instructions Vercel

### Ajouter les variables :

1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet `pulse` (ou celui qui sert `pulse-sigma-eight.vercel.app`)
3. **Settings** → **Environment Variables**
4. Ajouter chaque variable :
   - **Key** : nom de la variable (ex: `DATABASE_URL`)
   - **Value** : valeur de la variable
   - **Environment** : sélectionner Production, Preview, Development (selon besoin)
5. Cliquer sur **Save**

### Après ajout des variables :

**Option 1 : Redéployer automatiquement**
- Vercel redéploiera automatiquement si "Redeploy" est activé
- Sinon, aller dans **Deployments** → Trouver le dernier déploiement → **Redeploy** (avec "Clear Build Cache")

**Option 2 : Attendre le prochain push**
- Les nouvelles variables seront disponibles au prochain `git push`

## Vérification

Après déploiement, vérifier que le build passe :
- **Deployments** → Vérifier que le dernier déploiement a Status = **Ready** (pas Error)
- Si Error : Cliquer sur le déploiement → **Build Logs** → Chercher l'erreur

## Erreurs communes

### "Error: Cannot find module '.prisma/client/default'"
- **Fix appliqué** : Turbopack désactivé dans `next.config.ts`
- **Commit** : `a776a5e`

### "Missing DATABASE_URL"
- **Fix** : Ajouter `DATABASE_URL` dans Vercel Environment Variables

### "Missing AUTH_SECRET"
- **Fix** : Ajouter `AUTH_SECRET` dans Vercel Environment Variables
- Générer avec : `openssl rand -base64 32`

