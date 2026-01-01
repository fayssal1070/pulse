# Debug : Workflow OK mais pas de déploiement Vercel

## Vérifications immédiates

### 1. Vérifier les logs du workflow (OBLIGATOIRE)

1. GitHub → `fayssal1070/pulse` → Actions
2. Ouvrir le workflow "Vercel Deploy" (commit `21ea647`)
3. Cliquer sur "Trigger Vercel Deploy"
4. **Copier TOUT le contenu des logs**, notamment :
   - Le message `✅ Deploy hook triggered successfully` ou `❌ Deploy hook failed`
   - Le code HTTP (200, 201, 401, 403, 404, etc.)
   - Le body de la réponse JSON

### 2. Vérifier le Deploy Hook dans Vercel

1. Vercel → Project "pulse" → Settings → Git → Deploy Hooks
2. Vérifier :
   - Le hook existe
   - **Project** = "pulse" (pas un autre projet)
   - **Branch** = `main`
3. Cliquer sur le hook → Vérifier l'URL
4. **Copier l'URL complète du hook**

### 3. Comparer l'URL du hook avec le secret GitHub

1. GitHub → Settings → Secrets and variables → Actions
2. Vérifier `VERCEL_DEPLOY_HOOK`
3. **L'URL doit être EXACTEMENT la même** que celle dans Vercel

### 4. Tester le hook manuellement

```bash
curl -X POST "URL_DU_HOOK_COPIÉE_DE_VERCEL"
```

**Réponse attendue si OK :**
```json
{
  "job": {
    "id": "xxx",
    "state": "QUEUED"
  }
}
```

**Si erreur 401/403 :** Le hook est invalide → recréer
**Si erreur 404 :** Le hook n'existe plus → recréer
**Si 200 mais pas de déploiement :** Le hook pointe vers un autre projet

### 5. Vérifier les déploiements Vercel (tous types)

1. Vercel → Project "pulse" → Deployments
2. Filtrer par "All" (pas seulement Production)
3. Vérifier s'il y a des déploiements récents avec :
   - Source = "Deploy Hook"
   - Ou Source = "GitHub" (si la liaison Git fonctionne)

### 6. Si le hook ne fonctionne pas : Réparer la liaison Git directe

1. Vercel → Project "pulse" → Settings → Git
2. Vérifier :
   - Repository = `fayssal1070/pulse`
   - Production Branch = `main`
   - "Auto-deploy" activé
3. Si "Disconnect Git Repository" est visible :
   - Cliquer → "Disconnect"
   - Puis "Connect Git Repository"
   - Sélectionner `fayssal1070/pulse`
   - Production Branch : `main`
   - Activer "Auto-deploy"

## Action immédiate

**Envoyer :**
1. Les logs complets du workflow "Trigger Vercel Deploy" (commit `21ea647`)
2. L'URL du Deploy Hook depuis Vercel
3. Le résultat du `curl` manuel du hook

Cela permettra d'identifier la cause exacte.


