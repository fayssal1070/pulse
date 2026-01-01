# Guide: Vérifier le bon déploiement

## Objectif

Éviter les confusions entre preview URL et production en affichant clairement l'environnement et le commit hash.

## Informations affichées

### 1. Footer Dashboard (Admin only)

Sur le dashboard, en bas de page (visible uniquement pour les admins) :

```
Env: production | preview | development
Commit: abc1234
```

**Couleurs** :
- **production** : vert
- **preview** : jaune
- **development** : gris

### 2. Endpoint `/api/debug/costs`

L'endpoint retourne maintenant un objet `deployment` :

```json
{
  "orgId": "...",
  "count": 150,
  "sum_30d": 1234.56,
  "count_30d": 45,
  "deployment": {
    "env": "production",
    "commitSha": "abc1234567890...",
    "commitShaShort": "abc1234"
  }
}
```

## Comment vérifier qu'on est sur le bon déploiement

### Méthode 1: Footer Dashboard (Recommandé)

1. **Se connecter** en tant qu'admin
2. **Aller sur** `/dashboard`
3. **Scroller en bas** de la page
4. **Vérifier** :
   - ✅ **Env** : Doit afficher `production` (vert) pour la prod, `preview` (jaune) pour preview
   - ✅ **Commit** : Doit correspondre au commit attendu

**Exemple** :
```
Env: production  •  Commit: 6a1d791
```

### Méthode 2: Endpoint Debug

1. **Se connecter** en tant qu'admin
2. **Aller sur** `/dashboard`
3. **Cliquer** sur "Debug costs"
4. **Vérifier** dans le JSON :
   - ✅ `deployment.env` : `"production"` ou `"preview"`
   - ✅ `deployment.commitShaShort` : Doit correspondre au commit attendu

**Exemple** :
```json
{
  "deployment": {
    "env": "production",
    "commitSha": "6a1d791abc1234567890...",
    "commitShaShort": "6a1d791"
  }
}
```

### Méthode 3: Vercel Dashboard

1. **Aller sur** Vercel Dashboard → Projet → Deployments
2. **Trouver** le déploiement actif (Production ou Preview)
3. **Vérifier** :
   - ✅ Le commit hash affiché
   - ✅ L'URL du déploiement
4. **Comparer** avec le footer/endpoint debug

## Vérification rapide

### Checklist

- [ ] Footer affiche `production` (vert) sur la prod
- [ ] Footer affiche `preview` (jaune) sur les previews
- [ ] Commit hash dans le footer correspond au commit attendu
- [ ] Commit hash dans `/api/debug/costs` correspond au footer
- [ ] Commit hash correspond au commit dans Vercel Dashboard

### Cas d'erreur

**Si le footer affiche un mauvais commit** :
1. Vérifier que le dernier commit est bien pushé
2. Vérifier que Vercel a bien déployé le dernier commit
3. Attendre quelques minutes pour le déploiement
4. Vider le cache du navigateur si nécessaire

**Si le footer n'apparaît pas** :
1. Vérifier que vous êtes connecté en tant qu'admin
2. Vérifier que `ADMIN_EMAILS` contient votre email
3. Vérifier que `VERCEL_ENV` et `VERCEL_GIT_COMMIT_SHA` sont bien exposés

**Si les commits ne correspondent pas** :
1. Vérifier que le frontend et le backend sont sur le même déploiement
2. Comparer le commit du footer avec celui de `/api/debug/costs`
3. Si différents, il y a un problème de déploiement (redéployer)

## Variables d'environnement Vercel

Vercel expose automatiquement :
- `VERCEL_ENV` : `production`, `preview`, ou `development`
- `VERCEL_GIT_COMMIT_SHA` : Hash complet du commit déployé

Ces variables sont disponibles côté serveur et sont exposées au client via `next.config.ts`.

## Exemple de vérification

### Scénario : Vérifier qu'on teste sur la production

1. **Ouvrir** le dashboard en production
2. **Scroller en bas** : Voir `Env: production` (vert) et `Commit: 6a1d791`
3. **Cliquer** "Debug costs" : Vérifier que `deployment.env = "production"` et `deployment.commitShaShort = "6a1d791"`
4. **Vérifier** dans Vercel : Le commit `6a1d791` est bien déployé en production
5. **Confirmer** : On est bien sur la production avec le bon commit

### Scénario : Vérifier qu'on teste sur une preview

1. **Ouvrir** l'URL preview (ex: `pulse-abc123.vercel.app`)
2. **Scroller en bas** : Voir `Env: preview` (jaune) et `Commit: abc1234`
3. **Cliquer** "Debug costs" : Vérifier que `deployment.env = "preview"` et `deployment.commitShaShort = "abc1234"`
4. **Confirmer** : On est bien sur une preview avec le bon commit

## Notes

- Le footer n'apparaît que pour les admins (basé sur `ADMIN_EMAILS`)
- Le commit hash est tronqué à 7 caractères pour la lisibilité
- Le commit hash complet est disponible dans `/api/debug/costs`
- Les variables Vercel sont automatiquement disponibles, pas besoin de les configurer manuellement




