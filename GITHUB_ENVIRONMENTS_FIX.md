# Fix : Environnements GitHub en double

## Problème identifié
Deux environnements similaires :
- "Production - pulse"
- "Production - pulse-" (avec tiret)

## Solution

### 1. Vérifier où est défini le secret VERCEL_DEPLOY_HOOK

1. GitHub → `fayssal1070/pulse` → Settings → Secrets and variables → Actions
2. Vérifier si `VERCEL_DEPLOY_HOOK` est défini :
   - Au niveau **Repository** (visible directement)
   - Ou dans un **Environnement** (nécessite de cliquer sur l'environnement)

### 2. Nettoyer les environnements

**Option A : Supprimer les deux environnements (recommandé)**

1. GitHub → Settings → Environments
2. Supprimer "Production - pulse" (icône poubelle)
3. Supprimer "Production - pulse-" (icône poubelle)
4. Le workflow fonctionnera avec les secrets au niveau Repository

**Option B : Garder un seul environnement**

1. Supprimer "Production - pulse-" (celui avec le tiret)
2. Garder "Production - pulse"
3. Vérifier que `VERCEL_DEPLOY_HOOK` est dans cet environnement
4. Modifier le workflow pour utiliser cet environnement (voir ci-dessous)

### 3. Vérifier le secret au niveau Repository

1. GitHub → Settings → Secrets and variables → Actions
2. Si `VERCEL_DEPLOY_HOOK` n'existe pas au niveau Repository :
   - "New repository secret"
   - Name : `VERCEL_DEPLOY_HOOK`
   - Value : URL du Deploy Hook Vercel
   - "Add secret"

### 4. Si vous gardez un environnement, modifier le workflow

Modifier `.github/workflows/vercel-deploy.yml` :

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Ajouter cette ligne si vous gardez un environnement
    steps:
      ...
```

**Mais ce n'est PAS nécessaire** si le secret est au niveau Repository.

## Action recommandée

1. **Supprimer les deux environnements** (ils ne sont pas nécessaires pour ce workflow)
2. **Vérifier que `VERCEL_DEPLOY_HOOK` existe au niveau Repository**
3. **Si absent : créer le secret au niveau Repository**

Le workflow fonctionnera sans environnement spécifique.

