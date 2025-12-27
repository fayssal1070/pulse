# Diagnostic Production - AppShell Non Visible

## Étape A — Preuve du Commit Réellement Servi

### 1. Endpoint Public `/api/build-info`

**URL :** `https://pulse-sigma-eight.vercel.app/api/build-info`

**Format retourné :**
```json
{
  "commitShaShort": "1978f99",
  "commitSha": "1978f99...",
  "vercelEnv": "production",
  "vercelDeploymentId": "..."
}
```

**Commande de vérification :**
```bash
curl https://pulse-sigma-eight.vercel.app/api/build-info
```

**Ou dans navigateur :** Ouvrir directement l'URL → Affiche le JSON

### 2. Badge Fixe (Coin Inférieur Droit)

**Où :** Coin inférieur droit de TOUTES les pages (même sans AppShell)

**Format :** Badge noir avec `production • 1978f99`

**Action :**
1. Ouvrir `https://pulse-sigma-eight.vercel.app/dashboard`
2. Regarder coin inférieur droit
3. Noter le SHA affiché

**Temps :** 2 secondes

### 3. Conclusion Étape A

**Comparer :**
- Badge fixe affiche : `production • XXXXXXX`
- API `/api/build-info` retourne : `commitShaShort: "XXXXXXX"`
- Local `git log -1 --oneline` : `1978f99 fix: Add build info badge...`

**Résultat :**
- ✅ **Si SHA identique** : `Prod sert SHA=1978f99` → Passer à Étape C
- ❌ **Si SHA différent** : `Prod sert SHA=XXXXXXX` → Passer à Étape B

---

## Étape B — Si SHA ≠ Attendu : Corriger le Déploiement

### Checklist Minimale (3 Points)

#### 1. Vérifier le Projet Vercel
**Action :**
1. Vercel Dashboard → Projet "pulse-sigma-eight"
2. Settings → Git
3. Vérifier :
   - ✅ Repository = `fayssal1070/pulse`
   - ✅ Production Branch = `main`
   - ✅ Auto-deploy = Activé

**Si différent :** Corriger et attendre auto-deploy

#### 2. Vérifier le Domaine Attaché
**Action :**
1. Vercel Dashboard → Settings → Domains
2. Vérifier que `pulse-sigma-eight.vercel.app` est attaché au bon projet
3. Vérifier qu'il pointe vers "Production" (pas Preview)

**Si incorrect :** Re-attacher le domaine au bon projet

#### 3. Vérifier le Dernier Deployment Production
**Action :**
1. Vercel Dashboard → Deployments
2. Filtrer par "Production"
3. Vérifier le commit SHA du dernier deployment
4. Comparer avec `git log -1 --oneline` local

**Si différent :** Le commit n'est pas sur `main` ou Vercel n'a pas détecté le push

### Action Définitive : Forcer le Bon Déploiement

**Option Unique (Redeploy Production + Clear Cache) :**

1. Vercel Dashboard → Deployments
2. Trouver le dernier deployment avec commit `1978f99` (ou le commit attendu)
3. Si absent : Vérifier que le commit est bien sur `main` et pushé
4. Si présent mais pas en Production :
   - Cliquer sur "..." → "Promote to Production"
5. Si présent en Production mais SHA différent :
   - Cliquer sur "..." → "Redeploy"
   - **Désactiver** "Use existing Build Cache"
   - Cliquer "Redeploy"
6. Attendre 2-3 minutes
7. Vérifier via `/api/build-info` que `commitShaShort` = `1978f99`

**Confirmation :**
```bash
curl https://pulse-sigma-eight.vercel.app/api/build-info
```
**Résultat attendu :** `"commitShaShort": "1978f99"`

---

## Étape C — Si SHA = Attendu mais Sidebar Absente : Problème de Code

### Probe Visuel sur `/dashboard`

**Où :** Coin inférieur gauche de `/dashboard`

**Format :** Badge jaune avec :
- `AppShell: MOUNTED` (vert) ou `AppShell: NOT USED` (rouge)
- Source : `(app/dashboard/page.tsx)`

**Action :**
1. Ouvrir `https://pulse-sigma-eight.vercel.app/dashboard`
2. Regarder coin inférieur gauche
3. Noter le statut affiché

### Diagnostic selon le Probe

#### Si `AppShell: MOUNTED` mais Sidebar Invisible

**Causes possibles :**
1. **CSS masqué** → Vérifier console navigateur (erreurs CSS)
2. **Z-index** → Sidebar derrière autre élément
3. **Media query** → Desktop < 1024px (sidebar cachée sur mobile)
4. **JavaScript error** → Vérifier console navigateur

**Fix :**
- Hard refresh : `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
- Vérifier console navigateur pour erreurs
- Vérifier que l'écran est ≥ 1024px (desktop)

#### Si `AppShell: NOT USED`

**Causes possibles :**
1. **Mauvais fichier route** → Un autre fichier sert `/dashboard`
2. **Route group override** → `(dashboard)/dashboard/page.tsx` existe
3. **Layout qui wrap** → `app/dashboard/layout.tsx` existe et écrase
4. **Condition render** → AppShell conditionnellement non monté

**Vérifications :**
```bash
# Vérifier qu'il n'y a qu'un seul fichier dashboard
find app -name "*dashboard*" -type f

# Vérifier qu'il n'y a pas de layout dashboard
ls app/dashboard/layout.tsx  # Doit retourner "not found"

# Vérifier le code de app/dashboard/page.tsx
grep -n "AppShell" app/dashboard/page.tsx
```

**Fix selon cause :**
- Si route group : Supprimer ou déplacer vers `app/dashboard/page.tsx`
- Si layout : Supprimer `app/dashboard/layout.tsx` ou modifier pour ne pas écraser
- Si condition : Vérifier la condition et corriger

### Source Réelle de `/dashboard`

**Fichier :** `app/dashboard/page.tsx` (ligne 26)
**Layout :** `app/layout.tsx` (racine)
**AppShell :** Monté ligne 254 avec props correctes

**Vérification code :**
```typescript
// app/dashboard/page.tsx ligne 254
<AppShell 
  organizations={organizations} 
  activeOrgId={activeOrg?.id || null} 
  hasActiveAWS={hasActiveAWS}
  commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
  env={process.env.VERCEL_ENV}
>
```

**Si AppShell n'est pas monté :**
- Vérifier qu'il n'y a pas de `app/dashboard/layout.tsx`
- Vérifier qu'il n'y a pas de route group `(dashboard)`
- Vérifier qu'il n'y a pas de condition qui skip AppShell

---

## Test Final (3 Checks Max)

### Check 1 : SHA en Production
```bash
curl https://pulse-sigma-eight.vercel.app/api/build-info | jq .commitShaShort
```
**Résultat attendu :** `"1978f99"`

### Check 2 : Badge Fixe Visible
**Action :** Ouvrir `/dashboard` → Regarder coin inférieur droit
**Résultat attendu :** Badge noir avec `production • 1978f99`

### Check 3 : Probe AppShell
**Action :** Ouvrir `/dashboard` → Regarder coin inférieur gauche
**Résultat attendu :** Badge jaune avec `AppShell: MOUNTED (app/dashboard/page.tsx)`

**Si les 3 sont OK :** Le déploiement est correct et AppShell est monté ✅
**Si Check 1 KO :** Problème de déploiement Vercel → Étape B
**Si Check 1 OK mais Check 3 KO :** Problème de code → Étape C

---

## Fichiers Modifiés

1. `app/api/build-info/route.ts` - Endpoint public pour diagnostic
2. `app/api/debug/build-info/route.ts` - Mise à jour format
3. `components/build-info-global.tsx` - Badge fixe (coin inférieur droit)
4. `components/appshell-probe.tsx` - Probe visuel AppShell
5. `app/dashboard/page.tsx` - Ajout du probe AppShell

---

## Raison Précise

**Si SHA ≠ attendu :** Vercel n'a pas déployé le bon commit (mauvais projet/branch/domaine)
**Si SHA = attendu mais sidebar absente :** AppShell monté mais invisible (CSS/JS error) OU AppShell non monté (route/layout override)

**Chaque conclusion est prouvée par :**
- `/api/build-info` pour le SHA
- Badge fixe pour confirmation visuelle
- Probe AppShell pour le statut de montage



