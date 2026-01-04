# Validation : Nettoyage UI Debug

## Commit
**SHA :** `dae572a`  
**Message :** `chore: hide debug UI behind admin + flag and clean dashboard`

## Fichiers modifiés

### Créés
- `components/ui-debug-panel.tsx` - Panel debug unifié (admin + flag uniquement)
- `app/api/admin/check/route.ts` - Endpoint pour vérifier admin côté client
- `VERCEL_ENV_CLEANUP.md` - Documentation nettoyage env vars
- `VERCEL_ENV_VARS.md` - Documentation variables d'environnement

### Modifiés
- `app/dashboard/page.tsx` - Supprimé DEPLOY_PROOF, NAV SOURCE, UIDebug, AppShellProbe
- `components/app-shell.tsx` - BuildInfoBadge masqué sauf admin + flag
- `components/build-info-global.tsx` - Masqué sauf admin + flag
- `app/accounts/page.tsx` - Ajout isAdmin prop à AppShell
- `app/alerts/page.tsx` - Ajout isAdmin prop à AppShell
- `app/alerts/new/page.tsx` - Ajout isAdmin prop à AppShell
- `app/notifications/page.tsx` - Ajout isAdmin prop à AppShell
- `app/team/page.tsx` - Ajout isAdmin prop à AppShell
- `next.config.ts` - Ajout NEXT_PUBLIC_UI_DEBUG
- `middleware.ts` - Ajout /api/admin/check aux routes publiques

### Supprimés
- `components/appshell-probe.tsx` - Remplacé par UIDebugPanel
- `components/ui-debug.tsx` - Remplacé par UIDebugPanel

## Configuration requise

### Variable d'environnement Vercel

**NEXT_PUBLIC_UI_DEBUG** (string)
- Valeur : `"true"` pour activer le debug UI
- Valeur : `"false"` ou non définie pour désactiver (par défaut)
- Environnements : Production, Preview, Development (selon besoin)

**ADMIN_EMAILS** (déjà existante)
- Format : `email1@example.com,email2@example.com`
- Liste des emails admin (séparés par virgules)

## Validation

### 1. User non-admin (NEXT_PUBLIC_UI_DEBUG non défini ou "false")

**Vérifications :**
- ✅ `/dashboard` : Aucun badge "DEPLOY_PROOF" visible
- ✅ `/dashboard` : Aucun badge "NAV SOURCE" visible
- ✅ `/dashboard` : Aucun "UI Debug" visible
- ✅ `/dashboard` : Aucun badge "AppShell MOUNTED" en bas à gauche
- ✅ AppShell : Aucun badge "Build Info" (commit/env) dans la sidebar ou topbar
- ✅ Layout : Aucun badge "Build Info" en bas à droite
- ✅ Sidebar : Visible en desktop (>=1024px) avec "Cloud Accounts" et "Alerts"
- ✅ Mobile : Hamburger menu fonctionne

### 2. Admin + NEXT_PUBLIC_UI_DEBUG="true"

**Vérifications :**
- ✅ `/dashboard` : Panel debug visible en bas à droite (fond gris foncé)
- ✅ Panel debug affiche :
  - Commit SHA (7 caractères)
  - Env (production/preview/development)
  - Window width (px)
  - isLg (true/false)
  - Sidebar in DOM (true/false)
  - AppShell MOUNTED (true/false)
- ✅ AppShell : Badge "Build Info" visible dans sidebar et topbar
- ✅ Layout : Badge "Build Info" visible en bas à droite (si admin)

### 3. Fonctionnalités préservées

**Vérifications :**
- ✅ Sidebar : Visible en desktop (>=1024px)
- ✅ Navigation : Tous les liens fonctionnent (/dashboard, /accounts, /alerts, /notifications, /team)
- ✅ Mobile : Hamburger menu fonctionne
- ✅ Sync Now : Bouton visible si hasActiveAWS (pas de duplication)
- ✅ Quick Actions : Pas de duplication "Sync Now"

## Tests manuels

### Test 1 : User non-admin
1. Se connecter avec un compte non-admin
2. Aller sur `/dashboard`
3. Vérifier : Aucun élément debug visible
4. Vérifier : Sidebar visible en desktop

### Test 2 : Admin avec flag activé
1. Vercel → Settings → Environment Variables
2. Ajouter `NEXT_PUBLIC_UI_DEBUG` = `"true"` (Production)
3. Vérifier que `ADMIN_EMAILS` contient votre email
4. Redéployer
5. Se connecter avec compte admin
6. Aller sur `/dashboard`
7. Vérifier : Panel debug visible en bas à droite
8. Vérifier : Badges "Build Info" visibles

### Test 3 : Admin sans flag
1. Vercel → Settings → Environment Variables
2. Supprimer `NEXT_PUBLIC_UI_DEBUG` ou mettre `"false"`
3. Redéployer
4. Se connecter avec compte admin
5. Aller sur `/dashboard`
6. Vérifier : Aucun élément debug visible (même admin)

## Endpoints

- `/api/admin/check` - Retourne `{ isAdmin: boolean }` (protégé par auth)
- `/api/build-info` - Retourne commit/env (public, pas de debug UI)

## Notes

- Le panel debug est un composant client qui vérifie l'admin via `/api/admin/check`
- BuildInfoBadge et BuildInfoGlobal vérifient aussi admin + flag
- Tous les éléments debug sont conditionnels : `isAdmin && NEXT_PUBLIC_UI_DEBUG === "true"`



