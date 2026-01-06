# PR23 Quick Test (10 minutes)

## Prérequis
- Accès admin à `/admin/api-keys`
- Au moins une App créée dans le directory
- Migration PR23 appliquée

## Test 1: Créer une clé API avec restrictions

### Via UI
1. Aller sur `/admin/api-keys`
2. Cliquer "Create API Key"
3. Remplir :
   - Label: `test-key`
   - Default App: Sélectionner une app existante
   - Blocked Models: `gpt-4o` (dans le champ texte, séparé par virgule)
   - Daily Cost Limit (EUR): `0.01`
4. Cliquer "Create"
5. **⚠️ IMPORTANT**: Copier le secret affiché (ne sera plus montré)

### Résultat attendu
- Clé créée avec status "Active"
- Secret affiché une seule fois
- Audit log créé (action: CREATE)

---

## Test 2: GET /api/v1/models (vérifier lastUsedAt)

```bash
# Remplacer YOUR_API_KEY par le secret copié
curl -X GET https://your-domain.com/api/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Résultat attendu
- Status 200
- Liste de modèles retournée
- Aller sur `/admin/api-keys` → "Last Used" doit être mis à jour (timestamp récent)

---

## Test 3: POST /api/v1/chat/completions avec modèle bloqué

```bash
curl -X POST https://your-domain.com/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Résultat attendu
- Status 403
- Error message: `"Model gpt-4o is blocked by API key restrictions"`

---

## Test 4: POST /api/v1/chat/completions avec modèle autorisé (vérifier limite de coût)

D'abord, faire plusieurs requêtes pour dépasser 0.01 EUR:

```bash
# Faire plusieurs appels jusqu'à dépasser la limite
curl -X POST https://your-domain.com/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Test"}],
    "max_tokens": 100
  }'
```

### Résultat attendu
- Premiers appels: Status 200 (succès)
- Après avoir dépassé 0.01 EUR: Status 403
- Error message: `"Daily cost limit of €0.01 exceeded (current: €0.XX)"`

**Note**: Pour accélérer le test, vous pouvez créer une clé avec `dailyCostLimitEur = 0.001` et faire quelques appels.

---

## Test 5: POST /api/v1/responses

```bash
curl -X POST https://your-domain.com/api/v1/responses \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world",
    "model": "gpt-3.5-turbo"
  }'
```

### Résultat attendu
- Même comportement que `/api/v1/chat/completions`
- Vérifier que les restrictions (blocked models) et limites (cost limits) s'appliquent
- Vérifier que `lastUsedAt` est mis à jour

---

## Test 6: POST /api/v1/embeddings

```bash
curl -X POST https://your-domain.com/api/v1/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world",
    "model": "text-embedding-3-small"
  }'
```

### Résultat attendu
- Status 200 (si embeddings supporté par le provider)
- Ou 400 avec message clair si non supporté
- Vérifier que `lastUsedAt` est mis à jour

---

## Test 7: Vérifier que defaults sont appliqués

```bash
# Faire une requête SANS headers x-pulse-app
curl -X POST https://your-domain.com/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

### Vérification
- Aller sur `/costs` ou vérifier CostEvent dans la DB
- Vérifier que le CostEvent créé a `appId` défini avec la valeur du defaultAppId de la clé

---

## Test 8: Rotation de clé

1. Aller sur `/admin/api-keys`
2. Cliquer sur l'icône rotate (flèche circulaire) sur la clé "test-key"
3. Confirmer
4. **⚠️ IMPORTANT**: Copier le nouveau secret

### Résultat attendu
- Nouveau secret affiché
- Ancienne clé ne fonctionne plus (401)
- Nouvelle clé fonctionne
- Audit log créé (action: ROTATE)

---

## Test 9: Révocation de clé

1. Aller sur `/admin/api-keys`
2. Cliquer sur l'icône trash sur la clé "test-key"
3. Confirmer

### Résultat attendu
- Status change à "Revoked"
- Clé ne fonctionne plus (401)
- Audit log créé (action: REVOKE)

---

## Test 10: Vérifier /admin/health

1. Aller sur `/admin/health`
2. Vérifier la section "API Keys":
   - Active count
   - Revoked count
   - Never used count
   - Last used timestamps

### Résultat attendu
- Stats affichées correctement
- Section "Recent API Key Audits" montre les CREATE/ROTATE/REVOKE

---

## Notes importantes

- **Secrets affichés une seule fois**: Ne pas perdre le secret lors de la création/rotation
- **Cost limits**: Les limites sont calculées sur les coûts org-wide (pas per-key pour l'instant)
- **Defaults**: Les defaults de clé s'appliquent uniquement si les headers ne sont pas fournis
- **/api/ai/request**: Utilise encore l'auth session (NextAuth), pas les API keys. C'est normal pour l'instant.

---

## Checklist finale

- [ ] Clé créée avec blockedModels et dailyCostLimit
- [ ] GET /api/v1/models → 200, lastUsedAt mis à jour
- [ ] POST avec modèle bloqué → 403
- [ ] POST avec limite dépassée → 403 avec message clair
- [ ] /api/v1/responses → même comportement
- [ ] /api/v1/embeddings → fonctionne ou erreur claire
- [ ] Defaults appliqués (appId dans CostEvent)
- [ ] Rotation fonctionne (ancienne clé invalide, nouvelle valide)
- [ ] Révocation fonctionne (clé invalide)
- [ ] /admin/health affiche stats et audits

