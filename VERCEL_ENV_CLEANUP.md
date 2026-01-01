# Nettoyage des variables d'environnement Vercel

## Variables à SUPPRIMER

### 1. NODE_TLS_REJECT_UNAUTHORIZED
- **Valeur actuelle** : `0` (insécurisé)
- **Pourquoi supprimer** : Désactive la vérification des certificats TLS, rendant les connexions HTTPS vulnérables
- **Action** : Vercel Dashboard → Project Settings → Environment Variables → Supprimer `NODE_TLS_REJECT_UNAUTHORIZED`
- **Fix appliqué** : Le script `scripts/check-alerts-with-telegram.js` utilise maintenant le module `https` de Node.js avec les certificats système (comportement par défaut sécurisé)

## Variables à VÉRIFIER (ne pas supprimer si présentes)

### Variables OBLIGATOIRES pour le build

1. **DATABASE_URL**
   - Format : `postgresql://user:password@host:port/database?sslmode=require`
   - Environnements : Production, Preview, Development (tous)

2. **AUTH_SECRET**
   - Format : Chaîne aléatoire (générer avec `openssl rand -base64 32`)
   - Environnements : Production, Preview, Development (tous)

### Variables OPTIONNELLES (selon features)

3. **STRIPE_SECRET_KEY** (si Stripe activé)
   - Format : `sk_live_...` (production) ou `sk_test_...` (test)
   - Environnements : Production uniquement

4. **STRIPE_WEBHOOK_SECRET** (si webhooks Stripe)
   - Format : `whsec_...`
   - Environnements : Production uniquement

5. **AWS_ACCESS_KEY_ID** (si AWS Cost Explorer activé)
   - Environnements : Production, Preview (selon besoin)

6. **AWS_SECRET_ACCESS_KEY** (si AWS Cost Explorer activé)
   - Environnements : Production, Preview (selon besoin)

7. **TELEGRAM_BOT_TOKEN** (si notifications Telegram)
   - Note : Stocké dans la DB (Organization.telegramBotToken), pas besoin d'env var globale

## Instructions Vercel

### Supprimer NODE_TLS_REJECT_UNAUTHORIZED

1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet `pulse` (ou celui qui sert `pulse-sigma-eight.vercel.app`)
3. **Settings** → **Environment Variables**
4. Chercher `NODE_TLS_REJECT_UNAUTHORIZED`
5. Cliquer sur les 3 points `...` → **Delete**
6. Confirmer la suppression

### Vérifier les autres variables

1. Vérifier que `DATABASE_URL` et `AUTH_SECRET` sont présents
2. Si manquantes, les ajouter (voir `VERCEL_ENV_VARS.md` pour les détails)

## Après nettoyage

Le script `scripts/check-alerts-with-telegram.js` utilise maintenant le module `https` natif de Node.js qui :
- Utilise les certificats CA du système (sécurisé)
- Ne nécessite plus `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Gère correctement les erreurs TLS

## Validation

Après suppression de `NODE_TLS_REJECT_UNAUTHORIZED` :
- Le build Vercel ne doit plus afficher le warning : `Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure`
- Les appels Telegram (si configurés) doivent fonctionner avec TLS sécurisé


