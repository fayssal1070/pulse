# Guide de Déploiement PULSE sur Vercel (Staging)

Ce guide explique comment déployer PULSE sur Vercel avec une base de données PostgreSQL managée (Neon ou Supabase).

## 📋 Prérequis

- Compte GitHub (pour connecter le repo à Vercel)
- Compte Vercel (gratuit)
- Compte Neon ou Supabase (gratuit)

## 🗄️ Étape 1 : Créer la Base de Données PostgreSQL

### Option A : Neon (Recommandé)

1. Aller sur [https://neon.tech](https://neon.tech)
2. Créer un compte (gratuit)
3. Créer un nouveau projet :
   - Nom : `pulse-staging`
   - Région : Choisir la plus proche de vos utilisateurs
   - PostgreSQL version : 16 (ou la plus récente)
4. Une fois le projet créé, copier la **Connection String** (DATABASE_URL)
   - Format : `postgresql://user:password@host/database?sslmode=require`
   - ⚠️ **IMPORTANT** : Copier la connection string complète, elle sera nécessaire pour Vercel

### Option B : Supabase

1. Aller sur [https://supabase.com](https://supabase.com)
2. Créer un compte (gratuit)
3. Créer un nouveau projet :
   - Nom : `pulse-staging`
   - Mot de passe : Générer un mot de passe fort et le sauvegarder
   - Région : Choisir la plus proche
4. Une fois le projet créé :
   - Aller dans **Settings** > **Database**
   - Copier la **Connection String** (URI)
   - Format : `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
   - ⚠️ Remplacer `[PASSWORD]` par le mot de passe généré

## 🚀 Étape 2 : Déployer sur Vercel

### 2.1. Préparer le Repository GitHub

**Si le projet n'est pas encore sur GitHub, suivez ces étapes :**

#### Étape 2.1.1 : Créer le Repository sur GitHub

1. Aller sur [https://github.com](https://github.com)
2. Se connecter à votre compte
3. Cliquer sur le bouton **"+"** en haut à droite > **"New repository"**
4. Remplir le formulaire :
   - **Repository name** : `pulse` (ou un autre nom)
   - **Description** : Optionnel (ex: "PULSE - Cloud Cost Management Platform")
   - **Visibility** : Choisir **Private** (recommandé pour staging) ou **Public**
   - ⚠️ **NE PAS** cocher "Initialize this repository with a README" (le projet existe déjà)
5. Cliquer sur **"Create repository"**
6. GitHub affichera une page avec des instructions. **Copier l'URL du repository** (ex: `https://github.com/VOTRE_USERNAME/pulse.git`)

#### Étape 2.1.2 : Initialiser Git Localement (si pas déjà fait)

Ouvrir un terminal dans le dossier du projet (`C:\Users\USA\Desktop\pulse`) et exécuter :

```bash
# Vérifier si git est déjà initialisé
git status
```

**Si vous voyez une erreur "not a git repository"**, exécuter :

```bash
# Initialiser git dans le dossier actuel
git init
```

**Si git est déjà initialisé**, passer à l'étape suivante.

#### Étape 2.1.3 : Ajouter les Fichiers au Repository

```bash
# Ajouter tous les fichiers au staging
git add .

# Vérifier les fichiers ajoutés (optionnel)
git status
```

#### Étape 2.1.4 : Créer le Premier Commit

```bash
# Créer un commit avec tous les fichiers
git commit -m "Initial commit - Ready for staging deployment"
```

#### Étape 2.1.5 : Renommer la Branche en "main" (si nécessaire)

```bash
# Renommer la branche actuelle en "main" (standard GitHub)
git branch -M main
```

#### Étape 2.1.6 : Connecter le Repository Local à GitHub

**Remplacer `VOTRE_USERNAME` par votre nom d'utilisateur GitHub** :

```bash
# Ajouter le repository GitHub comme origine distante
git remote add origin https://github.com/VOTRE_USERNAME/pulse.git

# Vérifier que l'origine est bien configurée
git remote -v
```

#### Étape 2.1.7 : Pousser le Code sur GitHub

```bash
# Pousser le code sur GitHub (branche main)
git push -u origin main
```

**Si GitHub demande des identifiants** :
- Utiliser votre **nom d'utilisateur GitHub**
- Pour le mot de passe, utiliser un **Personal Access Token** (pas votre mot de passe GitHub)
  - Créer un token : GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic) > Generate new token
  - Permissions : cocher `repo` (accès complet aux repositories)

**Si le projet est déjà sur GitHub** :
- Vérifier que le repository est à jour : `git pull origin main`
- Si des changements locaux existent : `git add .`, `git commit -m "Update"`, `git push`

### 2.2. Connecter le Projet à Vercel

1. Aller sur [https://vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. Cliquer sur **Add New Project**
4. Importer le repository `pulse`
5. Configuration automatique :
   - **Framework Preset** : Next.js (détecté automatiquement)
   - **Root Directory** : `./` (par défaut)
   - **Build Command** : `npm run build` (par défaut)
   - **Output Directory** : `.next` (par défaut)
   - **Install Command** : `npm install` (par défaut)

### 2.3. Configurer les Variables d'Environnement

Dans Vercel, avant de déployer, ajouter toutes les variables d'environnement suivantes :

#### Variables Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string PostgreSQL (de Neon/Supabase) | `postgresql://user:pass@host/db?sslmode=require` |
| `AUTH_SECRET` | Secret pour NextAuth (générer avec `openssl rand -base64 32`) | `votre-secret-aleatoire-32-caracteres` |
| `NEXTAUTH_URL` | **ORIGIN ONLY** (scheme + domain, NO path). Set only for Production with stable domain. For Preview, use `AUTH_TRUST_HOST=true` instead. | `https://pulse-staging.vercel.app` (Production only) |
| `AUTH_TRUST_HOST` | Trust host header for preview deployments (URLs change per deploy). **REQUIRED for Preview environments.** | `true` |

#### Variables Optionnelles (pour Telegram)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Token du bot Telegram (si utilisé) | `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `TELEGRAM_CHAT_ID` | Chat ID Telegram (si utilisé) | `123456789` |

#### Comment Ajouter les Variables dans Vercel

1. Dans la page de configuration du projet Vercel
2. Section **Environment Variables**
3. Ajouter chaque variable :
   - **Key** : Nom de la variable
   - **Value** : Valeur de la variable
   - **Environment** : Sélectionner `Production`, `Preview`, et `Development`
4. ⚠️ **IMPORTANT - NEXTAUTH_URL Configuration** :
   - **NEXTAUTH_URL doit être SEULEMENT l'origine** (scheme + domain), **SANS chemin** (pas de `/organizations/new` ou autre path)
   - **Format correct** : `https://pulse-staging.vercel.app` ✅
   - **Format incorrect** : `https://pulse-staging.vercel.app/organizations/new` ❌
   - **Pour Production** : Définir `NEXTAUTH_URL` avec un domaine stable (ex: `https://pulse-staging.vercel.app`)
   - **Pour Preview** : **NE PAS définir `NEXTAUTH_URL`** (les URLs changent à chaque déploiement). Utiliser `AUTH_TRUST_HOST=true` à la place.

#### Générer AUTH_SECRET

```bash
# Sur Linux/Mac
openssl rand -base64 32

# Sur Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 2.4. Déployer

1. Cliquer sur **Deploy**
2. Attendre la fin du build (2-3 minutes)
3. Une fois déployé, Vercel affichera l'URL : `https://pulse-staging-xxx.vercel.app`

## 🗃️ Étape 3 : Exécuter les Migrations Prisma

### 3.1. Installer Prisma CLI Localement (si pas déjà fait)

```bash
npm install -g prisma
# ou
npx prisma
```

### 3.2. Configurer la DATABASE_URL Localement

Créer un fichier `.env.local` à la racine du projet :

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

⚠️ Utiliser la même connection string que celle configurée dans Vercel.

### 3.3. Exécuter les Migrations

```bash
# Vérifier le statut des migrations
npx prisma migrate status

# Appliquer toutes les migrations
npx prisma migrate deploy

# Générer le client Prisma
npx prisma generate
```

✅ Les migrations devraient s'appliquer sans erreur.

## 🌱 Étape 4 : Seeder un Compte Admin Staging

### 4.1. Créer un Script de Seed Staging

Le script de seed existe déjà : `prisma/seed.js`

### 4.2. Modifier le Seed pour Staging (Optionnel)

Pour créer un compte admin spécifique pour staging, vous pouvez modifier temporairement `prisma/seed.js` :

```javascript
// Dans prisma/seed.js, modifier :
const user = await prisma.user.create({
  data: {
    email: 'admin@staging.pulse.app', // Email de staging
    passwordHash: await bcrypt.hash('StagingPassword123!', 10), // Mot de passe fort
  },
})
```

### 4.3. Exécuter le Seed

```bash
# S'assurer que DATABASE_URL pointe vers la DB staging
npx prisma db seed
```

Ou directement :

```bash
node prisma/seed.js
```

✅ Un compte admin sera créé avec :
- Email : `owner@example.com` (ou celui modifié)
- Password : `password123` (ou celui modifié)

⚠️ **SÉCURITÉ** : Changer le mot de passe après le premier login en staging !

## ✅ Étape 5 : Vérifications Post-Déploiement

### 5.1. Vérifier l'URL Publique

1. Aller sur l'URL Vercel : `https://pulse-staging-xxx.vercel.app`
2. La page d'accueil devrait s'afficher

### 5.2. Tester l'Authentification

1. Aller sur `/login`
2. Se connecter avec les credentials du seed :
   - Email : `owner@example.com`
   - Password : `password123`
3. ✅ La connexion devrait fonctionner

### 5.3. Tester le Dashboard

1. Après connexion, redirection vers `/dashboard`
2. ✅ Le dashboard devrait afficher les données (si seed exécuté)

### 5.4. Tester l'Import CSV

1. Aller sur `/import`
2. Importer un fichier CSV de test
3. ✅ L'import devrait fonctionner

### 5.5. Tester les Alertes

1. Aller sur `/alerts`
2. Créer une règle d'alerte
3. ✅ La règle devrait être créée

### 5.6. Tester Telegram (si configuré)

1. Aller sur `/notifications`
2. Configurer le bot Telegram
3. Exécuter le script `check-alerts` (localement ou via cron)
4. ✅ La notification devrait être envoyée

## 🔧 Configuration Post-Déploiement

### Configuration NEXTAUTH_URL et AUTH_TRUST_HOST

**⚠️ IMPORTANT : NEXTAUTH_URL doit être SEULEMENT l'origine (scheme + domain), SANS chemin**

#### Pour Production (domaine stable)

1. Dans Vercel, aller dans **Settings** > **Environment Variables**
2. Ajouter/modifier `NEXTAUTH_URL` :
   - **Valeur** : `https://pulse-staging.vercel.app` (ou votre domaine personnalisé)
   - **Format** : Seulement l'origine, **PAS de chemin** (ex: ❌ `https://pulse-staging.vercel.app/organizations/new`)
   - **Environnement** : Sélectionner **Production uniquement**
3. Ajouter `AUTH_TRUST_HOST` :
   - **Valeur** : `true`
   - **Environnement** : Sélectionner **Production, Preview, Development**
4. Redéployer le projet (Vercel le fera automatiquement)

#### Pour Preview (URLs qui changent)

1. **NE PAS définir `NEXTAUTH_URL` pour Preview** (les URLs changent à chaque déploiement)
2. S'assurer que `AUTH_TRUST_HOST=true` est défini pour **Preview**
3. Auth.js utilisera automatiquement l'URL du déploiement via le header `Host`

### Configurer un Domaine Personnalisé (Optionnel)

1. Dans Vercel, aller dans **Settings** > **Domains**
2. Ajouter un domaine personnalisé
3. Suivre les instructions DNS

## 🐛 Dépannage

### Erreur : "Prisma Client not generated"

```bash
# Solution : Régénérer le client
npx prisma generate
```

### Erreur : "DATABASE_URL not found"

- Vérifier que la variable est bien configurée dans Vercel
- Vérifier qu'elle est disponible pour l'environnement (Production/Preview/Development)

### Erreur : "Migration failed"

- Vérifier que la connection string est correcte
- Vérifier que la base de données est accessible
- Vérifier les permissions de la base de données

### Erreur : "AUTH_SECRET not found"

- Générer un nouveau secret avec `openssl rand -base64 32`
- L'ajouter dans Vercel comme variable d'environnement

## 📝 Checklist de Déploiement

### Actions Automatiques (Déjà Faites)
- ✅ Build vérifié et corrigé
- ✅ Erreurs TypeScript corrigées
- ✅ Configuration Prisma pour staging
- ✅ Script postinstall ajouté (génération automatique du client Prisma)

### Actions Manuelles Requises

#### 1. Créer la Base de Données PostgreSQL
- [ ] Aller sur [https://neon.tech](https://neon.tech) ou [https://supabase.com](https://supabase.com)
- [ ] Créer un compte (gratuit)
- [ ] Créer un nouveau projet : `pulse-staging`
- [ ] Copier la **Connection String** (DATABASE_URL)
- [ ] Sauvegarder la DATABASE_URL dans un endroit sûr

#### 2. Préparer le Repository GitHub
- [ ] Initialiser git si pas déjà fait : `git init`
- [ ] Ajouter tous les fichiers : `git add .`
- [ ] Commit : `git commit -m "Ready for staging deployment"`
- [ ] Créer un repository sur GitHub
- [ ] Pousser le code : `git push -u origin main`

#### 3. Connecter le Projet à Vercel
- [ ] Aller sur [https://vercel.com](https://vercel.com)
- [ ] Se connecter avec GitHub
- [ ] Cliquer sur **Add New Project**
- [ ] Importer le repository `pulse`
- [ ] Vérifier la configuration automatique (Next.js détecté)

#### 4. Configurer les Variables d'Environnement dans Vercel
- [ ] Dans la page de configuration du projet Vercel
- [ ] Section **Environment Variables**
- [ ] Ajouter `DATABASE_URL` : Connection string de Neon/Supabase
- [ ] Générer `AUTH_SECRET` : `openssl rand -base64 32` (ou PowerShell équivalent)
- [ ] Ajouter `AUTH_SECRET` dans Vercel
- [ ] Ajouter `AUTH_TRUST_HOST` : `true` (sélectionner **Production, Preview, Development**)
- [ ] Ajouter `NEXTAUTH_URL` : `https://pulse-staging-xxx.vercel.app` (seulement l'origine, **SANS chemin**)
  - ⚠️ **IMPORTANT** : Sélectionner **Production uniquement** (pas Preview, car les URLs changent)
  - Format correct : `https://pulse-staging-xxx.vercel.app` ✅
  - Format incorrect : `https://pulse-staging-xxx.vercel.app/organizations/new` ❌

#### 5. Déployer sur Vercel
- [ ] Cliquer sur **Deploy**
- [ ] Attendre la fin du build (2-3 minutes)
- [ ] Noter l'URL générée : `https://pulse-staging-xxx.vercel.app`

#### 6. Configurer NEXTAUTH_URL et AUTH_TRUST_HOST
- [ ] Dans Vercel, aller dans **Settings** > **Environment Variables**
- [ ] Ajouter `AUTH_TRUST_HOST` : `true` (sélectionner **Production, Preview, Development**)
- [ ] Ajouter `NEXTAUTH_URL` : `https://pulse-staging-xxx.vercel.app` (seulement l'origine, **SANS chemin**)
  - ⚠️ Sélectionner **Production uniquement** (pas Preview)
  - Format correct : `https://pulse-staging-xxx.vercel.app` ✅
- [ ] Redéployer (Vercel le fera automatiquement)

#### 7. Exécuter les Migrations Prisma
- [ ] Installer Prisma CLI localement : `npm install -g prisma` (ou utiliser `npx prisma`)
- [ ] Créer un fichier `.env.local` avec : `DATABASE_URL="votre-connection-string"`
- [ ] Exécuter : `npx prisma migrate deploy`
- [ ] Vérifier : `npx prisma migrate status`

#### 8. Seeder un Compte Admin
- [ ] S'assurer que `.env.local` contient la DATABASE_URL de staging
- [ ] Exécuter : `npx prisma db seed` ou `node prisma/seed.js`
- [ ] Vérifier que le compte est créé :
  - Email : `owner@example.com`
  - Password : `password123`
- [ ] ⚠️ **IMPORTANT** : Changer le mot de passe après le premier login !

#### 9. Vérifications Post-Déploiement
- [ ] Accéder à l'URL Vercel : `https://pulse-staging-xxx.vercel.app`
- [ ] Vérifier que la page d'accueil s'affiche
- [ ] Tester `/login` avec les credentials du seed
- [ ] Vérifier que le dashboard s'affiche après connexion
- [ ] Tester `/import` avec un fichier CSV de test
- [ ] Tester `/alerts` : créer une règle d'alerte
- [ ] Tester `/notifications` : configurer Telegram (optionnel)
- [ ] Vérifier que toutes les fonctionnalités principales fonctionnent

## 🔐 Sécurité Staging

⚠️ **IMPORTANT** : Ceci est un environnement de staging, pas de production !

- Utiliser des mots de passe forts
- Ne pas exposer de données sensibles
- Limiter l'accès aux comptes de staging
- Ne pas utiliser de données de production

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Neon](https://neon.tech/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation NextAuth](https://next-auth.js.org)

