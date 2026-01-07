# PR24 Validation: API Key Enforcement Everywhere + Usage Tracking

## Prérequis
- Migration PR24 appliquée (apiKeyId dans AiRequestLog et CostEvent)
- Au moins une API key créée
- Provider configuré pour AI requests

---

## Test 1: `/api/ai/request` enforces blocked model + limits

1. Créer une clé API avec:
   - Label: `test-pr24-ai-request`
   - Blocked Models: `gpt-4o`
   - Daily Cost Limit: `0.01` EUR

2. Tester avec modèle bloqué:
```bash
curl -X POST https://your-domain.com/api/ai/request \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Résultat attendu:**
- Status 403
- Error: `"Model gpt-4o is blocked by API key restrictions"`

3. Tester avec modèle autorisé puis dépasser limite:
```bash
curl -X POST https://your-domain.com/api/ai/request \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

**Résultat attendu:**
- Après avoir dépassé 0.01 EUR: Status 403
- Error: `"Daily cost limit of €0.01 exceeded (current: €0.XX)"`

---

## Test 2: `/api/v1/models` updates lastUsedAt

```bash
curl -X GET https://your-domain.com/api/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Résultat attendu:**
- Status 200
- Liste de modèles retournée
- Aller sur `/admin/api-keys` → "Last Used" mis à jour (timestamp récent)

---

## Test 3: `/api/v1/embeddings` uses same auth helper

1. Créer une clé avec blockedModels = `["text-embedding-ada-002"]`

2. Tester avec modèle bloqué:
```bash
curl -X POST https://your-domain.com/api/v1/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world",
    "model": "text-embedding-ada-002"
  }'
```

**Résultat attendu:**
- Status 403
- Error: `"Model text-embedding-ada-002 is blocked by API key restrictions"`

3. Tester avec modèle autorisé:
```bash
curl -X POST https://your-domain.com/api/v1/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world",
    "model": "text-embedding-3-small"
  }'
```

**Résultat attendu:**
- Status 200
- Embeddings retournées
- `lastUsedAt` mis à jour

---

## Test 4: apiKeyId appears in AiRequestLog + CostEvent

1. Faire une requête réussie:
```bash
curl -X POST https://your-domain.com/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

2. Vérifier dans la DB ou via API:
```sql
SELECT id, apiKeyId, apiKeyLabelSnapshot, model, occurredAt 
FROM "AiRequestLog" 
WHERE apiKeyId IS NOT NULL 
ORDER BY occurredAt DESC 
LIMIT 5;
```

```sql
SELECT id, apiKeyId, apiKeyLabelSnapshot, amountEur, occurredAt 
FROM "CostEvent" 
WHERE apiKeyId IS NOT NULL 
ORDER BY occurredAt DESC 
LIMIT 5;
```

**Résultat attendu:**
- `apiKeyId` présent dans les deux tables
- `apiKeyLabelSnapshot` présent (peut être null si label non défini)
- Les valeurs correspondent à la clé utilisée

---

## Test 5: `/admin/api-keys/[id]` shows spend and requests

1. Aller sur `/admin/api-keys`
2. Cliquer sur une clé qui a été utilisée
3. Vérifier la page de détails

**Résultat attendu:**
- Page `/admin/api-keys/[id]` s'affiche
- Affiche:
  - Spend (MTD): montant correct
  - Spend (Last 24h): montant correct
  - Requests (Last 24h): nombre correct
  - Top Models (Last 24h): liste avec counts
  - Top Apps (Last 24h): liste avec counts (si attribution présente)
  - Recent Audits: liste des CREATE/ROTATE/REVOKE

---

## Test 6: `/admin/health` shows apiKeys + audits + failures

1. Aller sur `/admin/health`

**Résultat attendu:**
- Section "API Keys" affiche:
  - Active count
  - Revoked count
  - Never Used count
  - Oldest/Newest usage timestamps
  - Top 5 Keys by Spend (MTD) (si applicable)
- Section "Recent API Key Audits" affiche les 20 derniers audits
- Section "Recent API Key Failures" affiche les 10 dernières erreurs (401/403/429)

---

## Test 7: Cost limits are per-key (not org-wide)

1. Créer 2 clés:
   - Key A: dailyCostLimitEur = 0.01
   - Key B: dailyCostLimitEur = 0.05

2. Utiliser Key A jusqu'à dépasser 0.01 EUR

3. Utiliser Key B

**Résultat attendu:**
- Key A: bloquée après 0.01 EUR
- Key B: fonctionne normalement jusqu'à 0.05 EUR

---

## Test 8: Defaults are applied consistently

1. Créer une clé avec:
   - defaultAppId: une app existante
   - defaultProjectId: un projet existant

2. Faire une requête SANS headers x-pulse-app/x-pulse-project:
```bash
curl -X POST https://your-domain.com/api/ai/request \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

3. Vérifier CostEvent créé:
```sql
SELECT appId, projectId, apiKeyId 
FROM "CostEvent" 
WHERE apiKeyId = 'YOUR_KEY_ID' 
ORDER BY occurredAt DESC 
LIMIT 1;
```

**Résultat attendu:**
- `appId` = defaultAppId de la clé
- `projectId` = defaultProjectId de la clé
- `apiKeyId` = ID de la clé utilisée

---

## Test 9: Streaming includes apiKeyId

1. Faire une requête streaming:
```bash
curl -X POST https://your-domain.com/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

2. Vérifier AiRequestLog après streaming complet

**Résultat attendu:**
- Requête loggée avec `apiKeyId` présent
- CostEvent créé avec `apiKeyId` présent

---

## Test 10: All endpoints enforce restrictions consistently

Tester chaque endpoint avec la même clé bloquée:

1. `/api/ai/request` → 403 (bloqué)
2. `/api/v1/chat/completions` → 403 (bloqué)
3. `/api/v1/responses` → 403 (bloqué)
4. `/api/v1/embeddings` → 403 (bloqué)

**Résultat attendu:**
- Tous les endpoints retournent 403 avec le même message
- Cohérence dans l'application des restrictions

---

## Checklist finale

- [ ] `/api/ai/request` enforce blocked model + limits
- [ ] `/api/v1/models` updates lastUsedAt
- [ ] `/api/v1/embeddings` uses same auth helper
- [ ] apiKeyId appears in AiRequestLog + CostEvent
- [ ] `/admin/api-keys/[id]` shows spend and requests
- [ ] `/admin/health` shows apiKeys + audits + failures
- [ ] Cost limits are per-key (not org-wide)
- [ ] Defaults are applied consistently
- [ ] Streaming includes apiKeyId
- [ ] All endpoints enforce restrictions consistently

---

## Notes importantes

- **Cost limits per-key**: Les limites sont maintenant calculées par clé (filtre par `apiKeyId` dans `CostEvent`)
- **Auth unifié**: Tous les endpoints utilisent `requireApiKeyAuth()` pour cohérence
- **Tracking complet**: Toutes les requêtes loggées incluent `apiKeyId` et `apiKeyLabelSnapshot`
- **Health dashboard**: Affichage des top keys par spend, failures, et audits


