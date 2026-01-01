# Configuration Vercel Deploy Hook

## Problème
Le GitHub Action s'exécute mais aucun déploiement n'apparaît dans Vercel.

## Vérifications

### 1. Vérifier le secret GitHub

1. GitHub → `fayssal1070/pulse` → Settings → Secrets and variables → Actions
2. Vérifier que `VERCEL_DEPLOY_HOOK` existe
3. Si absent : créer le secret avec l'URL du Deploy Hook

### 2. Vérifier le Deploy Hook Vercel

1. Vercel Dashboard → Team "pulse's projects" → Project "pulse"
2. Settings → Git → Deploy Hooks (ou Settings → Deploy Hooks)
3. Vérifier qu'un hook existe avec :
   - Nom : `github-auto-deploy` (ou similaire)
   - Branch : `main`
   - URL : doit commencer par `https://api.vercel.com/v1/integrations/deploy/...`

### 3. Vérifier que le hook pointe vers le bon projet

1. Dans Vercel → Deploy Hooks → Cliquer sur le hook
2. Vérifier le "Project" associé : doit être "pulse"
3. Si c'est un autre projet : supprimer et recréer

### 4. Tester le hook manuellement

```bash
curl -X POST "URL_DU_HOOK_ICI"
```

**Réponse attendue :**
```json
{
  "job": {
    "id": "...",
    "state": "QUEUED"
  }
}
```

Si erreur 401/403 : le hook est invalide ou expiré → recréer

### 5. Vérifier les logs GitHub Action

1. GitHub → `fayssal1070/pulse` → Actions
2. Cliquer sur le dernier workflow "Vercel Deploy"
3. Vérifier les logs :
   - Si `❌ Error: VERCEL_DEPLOY_HOOK secret is not set` → secret manquant
   - Si `❌ Deploy hook failed (HTTP 401/403)` → hook invalide
   - Si `✅ Deploy hook triggered successfully` → le hook fonctionne, mais Vercel ne crée pas de déploiement

### 6. Si le hook fonctionne mais pas de déploiement

**Causes possibles :**
- Le hook pointe vers un autre projet Vercel
- Le projet "pulse" n'a pas les permissions de déploiement
- Le hook est limité à certaines branches (vérifier la config)

**Solution :**
1. Supprimer l'ancien hook
2. Créer un nouveau hook :
   - Project : "pulse"
   - Branch : `main`
   - Copier la nouvelle URL
3. Mettre à jour le secret GitHub `VERCEL_DEPLOY_HOOK` avec la nouvelle URL

## Alternative : Réparer la liaison Git directe

Si le Deploy Hook ne fonctionne pas, réparer la liaison Git :

1. Vercel → Project "pulse" → Settings → Git
2. Si "Disconnect Git Repository" est visible :
   - Cliquer → "Disconnect"
   - Puis "Connect Git Repository"
   - Sélectionner `fayssal1070/pulse`
   - Production Branch : `main`
   - Activer "Auto-deploy"
3. Vérifier dans GitHub → Settings → Webhooks qu'un webhook Vercel existe


