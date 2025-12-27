# Diagnostic Vercel - Commit 8d610ee au lieu de dc01926

## PROBLÈME
Vercel déploie toujours le commit `8d610ee` (ancien, sans AppShell) au lieu de `dc01926` (actuel, avec AppShell).

## PREUVE GIT

**Commit actuel sur origin/main :**
```
dc01926 fix: deploy AppShell + build-info endpoint (proof)
```

**Commit déployé par Vercel (selon /admin/build-info) :**
```
8d610ee Fix dashboard banner logic: distinguish NO_SPEND_YET from DATA_PENDING
```

**Position dans l'historique :**
- `8d610ee` est **22 commits en arrière** de `dc01926`
- `8d610ee` est **AVANT** tous les commits AppShell (`c506599`, `cd14f13`, etc.)

## CAUSES POSSIBLES

1. **Mauvais projet Vercel** : Le domaine `pulse-sigma-eight.vercel.app` est lié à un autre projet
2. **Mauvaise branche** : Vercel déploie une autre branche (pas `main`)
3. **Intégration Git cassée** : Vercel ne détecte pas les nouveaux commits

## ACTIONS À FAIRE DANS VERCEL

### Étape 1 : Vérifier le projet et la branche

1. Aller sur https://vercel.com/dashboard
2. Trouver le projet qui sert `pulse-sigma-eight.vercel.app`
3. Cliquer sur le projet
4. Aller dans **Settings** → **Git**
5. Vérifier :
   - **Repository** : `fayssal1070/pulse` (pas un autre repo)
   - **Production Branch** : `main` (pas `master`, `develop`, etc.)
   - **Root Directory** : `/` (pas un sous-dossier)

### Étape 2 : Vérifier les déploiements

1. Aller dans l'onglet **Deployments**
2. Vérifier le dernier déploiement :
   - **Commit SHA** : doit être `dc01926` (pas `8d610ee`)
   - **Branch** : doit être `main`
   - **Status** : doit être `Ready` (pas `Error`, `Canceled`)

### Étape 3 : Si le dernier déploiement est `8d610ee`

**Option A : Redéployer manuellement**
1. Dans **Deployments**, trouver le déploiement avec SHA `dc01926`
2. Cliquer sur les 3 points `...` → **Redeploy**
3. Sélectionner **Use existing Build Cache** : **NO** (forcer rebuild complet)

**Option B : Reconnecter Git**
1. **Settings** → **Git** → **Disconnect**
2. **Connect Git Repository** → Sélectionner `fayssal1070/pulse`
3. Vérifier que **Production Branch** = `main`
4. Cliquer sur **Deploy**

### Étape 4 : Vérifier le domaine

1. **Settings** → **Domains**
2. Vérifier que `pulse-sigma-eight.vercel.app` est bien lié à ce projet
3. Si plusieurs projets ont ce domaine, supprimer les autres liens

## VALIDATION

Après correction, vérifier :

1. **Dans Vercel** : Le dernier déploiement a SHA = `dc01926`
2. **Sur le site** : `/admin/build-info` affiche SHA = `dc01926`
3. **Sur le site** : `/api/build-info` répond 200 JSON avec `commitShaShort: "dc01926"`
4. **Sur le site** : `/dashboard` affiche "NAV SOURCE: AppShell"
5. **Sur le site** : Sidebar visible en desktop avec "Cloud Accounts" et "Alerts"

## COMMANDES GIT DE RÉFÉRENCE

```bash
# Vérifier le commit actuel sur origin/main
git log origin/main -1 --oneline
# Résultat attendu : dc01926 fix: deploy AppShell + build-info endpoint (proof)

# Vérifier que 8d610ee est bien ancien
git log --oneline --all | grep -A 5 "8d610ee"
# Résultat : 8d610ee est 22 commits en arrière de dc01926
```

