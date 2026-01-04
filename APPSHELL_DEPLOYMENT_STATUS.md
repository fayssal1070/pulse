# AppShell Deployment Status

## Problème identifié

Le dashboard en production n'affiche pas le nouveau AppShell (sidebar desktop + topbar mobile) car **les modifications ne sont pas commitées**.

## État actuel

### Code local (repo)
- ✅ **AppShell implémenté** dans :
  - `components/app-shell.tsx` (nouveau fichier)
  - `components/sync-now-button.tsx` (nouveau fichier)
  - `app/dashboard/page.tsx` (modifié - utilise AppShell)
  - `app/alerts/page.tsx` (modifié - utilise AppShell)
  - `app/accounts/page.tsx` (modifié - utilise AppShell)
  - `app/notifications/page.tsx` (modifié - utilise AppShell)
  - `app/team/page.tsx` (modifié - utilise AppShell)
  - `app/alerts/new/page.tsx` (nouveau - utilise AppShell)

### Production (Vercel)
- ❌ **Dernier commit déployé** : `3c6f428` (feat: Alerts V1 system)
- ❌ **AppShell non présent** dans ce commit
- ❌ **Affiche encore l'ancienne navbar** "Team / Notifications / Logout"

## Solution

### 1. Commit les modifications

```bash
git add .
git commit -m "feat: Dashboard V2 action-first + global navigation + /accounts + global alerts"
git push origin main
```

### 2. Vérifier le déploiement Vercel

1. Aller sur https://vercel.com/dashboard
2. Vérifier que le nouveau commit est détecté
3. Attendre la fin du build (généralement 2-3 minutes)
4. Vérifier que le déploiement est en "Production"

### 3. Vérifier en production

#### A. Indicateur de commit SHA sur le dashboard

Sur `/dashboard`, en haut à gauche sous le titre, vous verrez :
```
Env: production • Commit: [7 premiers caractères du SHA]
```

**Comparaison attendue :**
- **Prod avant fix** : `Commit: 3c6f428` (ou autre ancien SHA)
- **Prod après fix** : `Commit: [nouveau SHA]` (doit correspondre à `git log -1`)

#### B. Test de validation visuelle

**Desktop (≥1024px) :**
1. Ouvrir `/dashboard`
2. ✅ **Sidebar visible à gauche** avec menu :
   - 📊 Dashboard
   - ☁️ Cloud Accounts
   - 🔔 Alerts
   - 🔔 Notifications
   - 👥 Team
   - 💳 Billing (si org active)
3. ✅ **Dropdown d'organisation** en haut de la sidebar
4. ✅ **Bouton "Sync Now"** visible (si AWS actif)

**Mobile (<1024px) :**
1. Ouvrir `/dashboard`
2. ✅ **Topbar avec hamburger menu** (☰) en haut à gauche
3. ✅ **Cliquer sur hamburger** → sidebar slide depuis la gauche
4. ✅ **Menu contient** : Dashboard, Cloud Accounts, Alerts, Notifications, Team

### 4. URLs à vérifier en production

Toutes ces pages doivent afficher AppShell :

- ✅ `/dashboard` - Sidebar avec "Cloud Accounts" et "Alerts"
- ✅ `/accounts` - Sidebar avec "Cloud Accounts" et "Alerts"
- ✅ `/alerts` - Sidebar avec "Cloud Accounts" et "Alerts"
- ✅ `/alerts/new` - Sidebar avec "Cloud Accounts" et "Alerts"
- ✅ `/notifications` - Sidebar avec "Cloud Accounts" et "Alerts"
- ✅ `/team` - Sidebar avec "Cloud Accounts" et "Alerts"

### 5. Si le problème persiste après déploiement

#### A. Vérifier le commit SHA

1. Aller sur `/dashboard` en production
2. Noter le commit SHA affiché
3. Comparer avec `git log -1` en local
4. Si différent → problème de déploiement Vercel

#### B. Actions Vercel

1. **Redeploy manuel** :
   - Vercel Dashboard → Project → Deployments
   - Cliquer sur "..." → "Redeploy"

2. **Vérifier la branch** :
   - Settings → Git → Production Branch
   - Doit être `main` (ou `master`)

3. **Vérifier auto-deploy** :
   - Settings → Git → Auto-deploy
   - Doit être activé

#### C. Si prod est à jour mais UI inchangée

Vérifier :
1. **Cache navigateur** : Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. **Cache Vercel** : Redeploy avec "Clear Cache"
3. **Layout override** : Vérifier qu'il n'y a pas de `app/dashboard/layout.tsx`
4. **Import AppShell** : Vérifier que `app/dashboard/page.tsx` importe bien AppShell

## Fichiers modifiés/créés

### Nouveaux fichiers
- `components/app-shell.tsx`
- `components/sync-now-button.tsx`
- `app/accounts/page.tsx` (refactorisé)
- `app/alerts/new/page.tsx`
- `app/alerts/new/new-alert-form-global.tsx`

### Fichiers modifiés
- `app/dashboard/page.tsx` - Utilise AppShell + Quick Actions
- `app/alerts/page.tsx` - Utilise AppShell
- `app/notifications/page.tsx` - Utilise AppShell
- `app/team/page.tsx` - Utilise AppShell
- `app/api/cloud-accounts/route.ts` - Ajout GET pour liste globale

## Validation finale

**Test de validation simple :**
- Ouvrir `/dashboard` en production
- ✅ Sidebar contient "Cloud Accounts" → **OK**
- ✅ Sidebar contient "Alerts" → **OK**
- ✅ Commit SHA affiché correspond au dernier commit local → **OK**

Si ces 3 conditions sont remplies, AppShell est correctement déployé.





