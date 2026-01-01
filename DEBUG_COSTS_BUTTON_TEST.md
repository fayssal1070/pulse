# Test: Debug Costs Button

## Description

Le bouton "Debug costs" apparaît sur le dashboard uniquement pour les utilisateurs admin. Il permet d'appeler `/api/debug/costs` et d'afficher les résultats dans une modal.

## Prérequis

1. **Variable d'environnement `ADMIN_EMAILS`** doit être configurée sur Vercel (ou localement dans `.env.local`)
   - Format: `ADMIN_EMAILS=admin@example.com,owner@example.com`
   - L'email de l'utilisateur connecté doit être dans cette liste

2. **Utilisateur admin** doit être connecté

## Test Local

### 1. Configuration

1. Créer/modifier `.env.local` :
   ```
   ADMIN_EMAILS=votre-email@example.com
   ```

2. Démarrer le serveur :
   ```bash
   npm run dev
   ```

### 2. Test en tant qu'admin

1. **Se connecter** avec un compte dont l'email est dans `ADMIN_EMAILS`
2. **Aller sur** `/dashboard`
3. **Vérifier** :
   - ✅ Le bouton "Debug costs" apparaît en haut à droite du titre "Dashboard"
   - ✅ Le bouton a une icône de bug (🐛)
4. **Cliquer** sur "Debug costs"
5. **Vérifier** :
   - ✅ Une modal s'ouvre
   - ✅ Le bouton affiche "Loading..." pendant la requête
   - ✅ La modal affiche :
     - **Sum (30 days)** : montant en EUR dans un bloc bleu
     - **Count (30 days)** : nombre de records dans un bloc vert
     - **Full Response** : JSON complet formaté
6. **Vérifier le JSON** contient :
   - `orgId`
   - `count`
   - `minDate` / `maxDate`
   - `sum_30d`
   - `count_30d`
   - `awsAccount` (si AWS connecté)

### 3. Test en tant que non-admin

1. **Se connecter** avec un compte dont l'email n'est PAS dans `ADMIN_EMAILS`
2. **Aller sur** `/dashboard`
3. **Vérifier** :
   - ✅ Le bouton "Debug costs" n'apparaît PAS
   - ✅ Aucun élément debug visible

## Test sur Vercel

### 1. Configuration

1. **Vérifier** que `ADMIN_EMAILS` est configuré sur Vercel :
   - Vercel Dashboard → Projet → Settings → Environment Variables
   - Variable: `ADMIN_EMAILS`
   - Value: `votre-email@example.com` (ou liste d'emails séparés par virgule)

2. **Redéployer** si nécessaire pour que les changements soient actifs

### 2. Test en tant qu'admin

1. **Se connecter** sur Vercel avec un compte admin
2. **Aller sur** `/dashboard`
3. **Vérifier** :
   - ✅ Le bouton "Debug costs" apparaît
4. **Cliquer** sur "Debug costs"
5. **Vérifier** :
   - ✅ La modal s'ouvre
   - ✅ Les données s'affichent correctement
   - ✅ `sum_30d` et `count_30d` sont clairement visibles

### 3. Test en tant que non-admin

1. **Se connecter** sur Vercel avec un compte non-admin
2. **Aller sur** `/dashboard`
3. **Vérifier** :
   - ✅ Le bouton "Debug costs" n'apparaît PAS

## Vérification des données affichées

### Métriques clés (highlighted)

- **Sum (30 days)** : Doit afficher le montant total en EUR sur 30 jours
- **Count (30 days)** : Doit afficher le nombre de records sur 30 jours

### JSON complet

Le JSON doit contenir :
```json
{
  "orgId": "clx...",
  "count": 150,
  "minDate": "2024-01-01T00:00:00.000Z",
  "maxDate": "2024-01-15T00:00:00.000Z",
  "sum_30d": 1234.56,
  "count_30d": 45,
  "awsAccount": {
    "id": "clx...",
    "lastSyncedAt": "2024-01-15T10:30:00.000Z"
  } | null
}
```

## Cas d'erreur

### Si l'endpoint retourne une erreur

1. **Cliquer** sur "Debug costs"
2. **Vérifier** :
   - ✅ La modal s'ouvre
   - ✅ Un message d'erreur rouge s'affiche
   - ✅ Le message d'erreur est clair et actionnable

### Si l'utilisateur n'est pas authentifié

- L'endpoint `/api/debug/costs` doit retourner 401/403
- La modal doit afficher l'erreur

## Checklist de test

- [ ] Bouton visible uniquement pour admin
- [ ] Bouton invisible pour non-admin
- [ ] Modal s'ouvre au clic
- [ ] Loading state pendant la requête
- [ ] Métriques clés affichées (sum_30d, count_30d)
- [ ] JSON complet affiché et formaté
- [ ] Gestion d'erreur fonctionnelle
- [ ] Modal se ferme au clic sur "Close" ou backdrop
- [ ] Test local OK
- [ ] Test Vercel OK

## Notes

- Le bouton utilise l'icône `Bug` de `lucide-react`
- La modal est responsive (mobile-friendly)
- Les métriques clés sont mises en évidence avec des couleurs (bleu pour sum, vert pour count)
- Le JSON est formaté avec `JSON.stringify(data, null, 2)` pour une lecture facile




