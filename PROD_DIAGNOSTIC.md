# Diagnostic Production - AppShell Non Visible

## 3 Moyens de Vérifier le SHA en Production

### 1. Badge Fixe (Coin inférieur droit)
**Où :** Coin inférieur droit de TOUTES les pages (même sans AppShell)
**Format :** Badge noir avec `production • cd14f13`
**Action :** Ouvrir n'importe quelle page → Regarder coin inférieur droit
**Temps :** 2 secondes

### 2. Endpoint API
**URL :** `https://pulse-sigma-eight.vercel.app/api/debug/build-info`
**Format :** JSON avec `commitSha`, `commitShaShort`, `env`
**Action :** Ouvrir dans navigateur ou curl
**Temps :** 1 seconde

### 3. Dashboard (si accessible)
**Où :** Sous le titre "Dashboard" (ligne 288-292)
**Format :** `Env: production • Commit: cd14f13`
**Action :** Ouvrir `/dashboard` → Regarder sous le titre
**Temps :** 2 secondes

---

## Vérification du SHA Réel

### Étape 1 : Vérifier via Badge Fixe
1. Ouvrir `https://pulse-sigma-eight.vercel.app/dashboard`
2. Regarder coin inférieur droit
3. Noter le SHA affiché
4. **Résultat :** `Prod = SHA XXXXXXX`

### Étape 2 : Vérifier via API
```bash
curl https://pulse-sigma-eight.vercel.app/api/debug/build-info
```
**Résultat attendu :**
```json
{
  "commitSha": "cd14f13...",
  "commitShaShort": "cd14f13",
  "env": "production",
  "buildId": "...",
  "timestamp": "..."
}
```

### Étape 3 : Comparer avec Local
```bash
git log -1 --oneline
```
**Résultat attendu :** `cd14f13 feat: AppShell global nav + accounts page + global alerts`

---

## Diagnostic : Prod ≠ cd14f13

### Cause Possible 1 : Mauvais Projet Vercel
**Vérification :**
1. Vercel Dashboard → Projet "pulse-sigma-eight"
2. Settings → Git
3. Vérifier :
   - Repository = `fayssal1070/pulse`
   - Production Branch = `main`
   - Auto-deploy = Activé

**Si différent :** Corriger et redeploy

### Cause Possible 2 : Commit en Preview au lieu de Production
**Vérification :**
1. Vercel Dashboard → Deployments
2. Chercher le deployment avec commit `cd14f13`
3. Vérifier la colonne "Environment"
   - ✅ "Production" = OK
   - ❌ "Preview" = Problème

**Si Preview :** Le commit n'est pas sur `main` ou Vercel n'a pas détecté le push

### Cause Possible 3 : Cache Vercel
**Vérification :**
1. Vercel Dashboard → Deployments
2. Vérifier le dernier deployment Production
3. Vérifier la date/heure vs push local

**Si ancien :** Redeploy manuel nécessaire

### Cause Possible 4 : Mauvais Repo/Branch
**Vérification :**
1. Vercel Dashboard → Settings → Git
2. Vérifier le Repository URL
3. Vérifier la Production Branch
4. Vérifier les webhooks GitHub

**Si incorrect :** Reconnecter le repo

---

## Procédure Minimale : Forcer Déploiement Correct

### Option 1 : Redeploy Manuel
1. Vercel Dashboard → Deployments
2. Trouver le dernier deployment (même si Preview)
3. Cliquer sur "..." → "Redeploy"
4. Sélectionner "Use existing Build Cache" = OFF
5. Cliquer "Redeploy"
6. Attendre 2-3 minutes
7. Vérifier badge fixe → SHA doit être `cd14f13`

### Option 2 : Push Vide (Force Rebuild)
```bash
git commit --allow-empty -m "force redeploy"
git push origin main
```
Attendre auto-deploy Vercel (2-3 min)

### Option 3 : Clear Cache + Redeploy
1. Vercel Dashboard → Deployments
2. Trouver deployment avec `cd14f13`
3. "..." → "Redeploy" → Désactiver cache
4. Attendre rebuild complet

---

## Diagnostic : Prod = cd14f13 mais UI Inchangée

### Cause Possible : Routing/Layout

#### Vérification 1 : Route Dashboard Unique
**Fichier réel :** `app/dashboard/page.tsx`
**Vérification :**
- ✅ Un seul fichier `app/dashboard/page.tsx`
- ✅ Pas de `app/(dashboard)/dashboard/page.tsx`
- ✅ Pas de `src/app/dashboard/page.tsx`

#### Vérification 2 : Layout Dashboard
**Fichier :** `app/dashboard/layout.tsx` (n'existe pas)
**Vérification :**
- ✅ Pas de layout spécifique dashboard
- ✅ Utilise `app/layout.tsx` (racine)

#### Vérification 3 : AppShell Monté
**Fichier :** `app/dashboard/page.tsx` ligne 254
**Vérification :**
```typescript
<AppShell 
  organizations={organizations} 
  activeOrgId={activeOrg?.id || null} 
  hasActiveAWS={hasActiveAWS}
  commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
  env={process.env.VERCEL_ENV}
>
```
**Si présent :** AppShell devrait être monté

#### Vérification 4 : Ancienne Navbar Écrase AppShell
**Recherche :** Ancienne navbar avec "Team / Notifications / Logout"
**Fichiers suspects :**
- `app/organizations/[id]/page.tsx` (ligne 78-98) - Navbar locale
- Autres layouts qui pourraient wrapper

**Si trouvé :** Supprimer ou remplacer par AppShell

---

## Conclusion Diagnostic

### Si Prod ≠ cd14f13 :
**Cause :** Vercel n'a pas déployé le bon commit
**Fix :** Redeploy manuel + vérifier branch/repo

### Si Prod = cd14f13 mais UI inchangée :
**Cause :** Ancienne navbar dans `app/organizations/[id]/page.tsx` ou layout qui écrase
**Fix :** Remplacer ancienne navbar par AppShell ou supprimer

---

## Check Final en 3 Points

1. ✅ **Badge fixe visible** (coin inférieur droit) avec SHA `cd14f13`
2. ✅ **Sidebar AppShell visible** sur `/dashboard` avec "Cloud Accounts" et "Alerts"
3. ✅ **API `/api/debug/build-info`** retourne `commitShaShort: "cd14f13"`

**Si les 3 sont OK :** Le déploiement est correct ✅
**Si 1 seul OK :** Problème de routing/layout
**Si aucun OK :** Problème de déploiement Vercel





