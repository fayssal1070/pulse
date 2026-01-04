# PR16 Validation Checklist

## Objectif
Permettre à n'importe quelle app (LangChain, OpenAI SDK, etc.) de pointer vers Pulse comme si c'était l'API OpenAI via `/api/v1/*` endpoints.

## Checklist

### A) Prisma + Migration
- [ ] Migration `20250201000000_add_ai_gateway_key_defaults_ratelimit` appliquée
- [ ] `AiGatewayKey` a les nouveaux champs: `enabled`, `defaultAppId`, `defaultProjectId`, `defaultClientId`, `rateLimitRpm`
- [ ] Table `ApiKeyUsageWindow` créée avec relations correctes
- [ ] Relations FK vers `App`, `Project`, `Client` fonctionnent

### B) Authentication
- [ ] `lib/ai/api-key-auth.ts` authentifie correctement via `Authorization: Bearer <API_KEY>`
- [ ] `resolveAttribution()` utilise headers `x-pulse-app`, `x-pulse-project`, `x-pulse-client` ou fallback sur key defaults
- [ ] Erreurs d'authentification renvoient des codes 401/403 appropriés

### C) Rate Limiting
- [ ] `lib/ratelimit.ts` implémente fenêtre 60s correctement
- [ ] Rate limit check avant chaque requête API
- [ ] Retourne 429 avec headers `X-RateLimit-*` si dépassé
- [ ] Fail-soft: si erreur DB, permet la requête (ne bloque pas)

### D) Endpoints OpenAI-compatibles

#### `/api/v1/chat/completions`
- [ ] Accepte POST avec body `{model, messages, max_tokens, temperature}`
- [ ] Authentifie via Bearer token
- [ ] Applique rate limit
- [ ] Résout attribution (headers ou defaults)
- [ ] Route vers provider via PR15 router
- [ ] Crée `AiRequestLog` avec bonnes dimensions
- [ ] Crée `CostEvent` avec attribution correcte
- [ ] Retourne réponse OpenAI-compatible:
  ```json
  {
    "id": "chatcmpl-...",
    "object": "chat.completion",
    "created": 1234567890,
    "model": "gpt-4",
    "choices": [{"index": 0, "message": {...}, "finish_reason": "stop"}],
    "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
  }
  ```

#### `/api/v1/embeddings`
- [ ] Accepte POST avec body `{input, model}`
- [ ] Authentifie via Bearer token
- [ ] Applique rate limit
- [ ] Retourne réponse OpenAI-compatible (placeholder pour l'instant)
- [ ] Format: `{object: "list", data: [{embedding: [...], index: 0}], usage: {...}}`

#### `/api/v1/models`
- [ ] Accepte GET
- [ ] Authentifie via Bearer token
- [ ] Retourne liste des modèles autorisés pour l'org (depuis `AiModelRoute` enabled)
- [ ] Format OpenAI-compatible: `{object: "list", data: [{id: "...", owned_by: "..."}]}`

### E) Developer Portal UI

#### Page `/developer`
- [ ] Visible pour admin/manager seulement
- [ ] Affiche liste des `AiGatewayKeys` (sans hash, avec keyPrefix)
- [ ] Formulaire pour créer nouvelle clé
- [ ] Permet de configurer `defaultAppId`, `defaultProjectId`, `defaultClientId`, `rateLimitRpm`
- [ ] Permet d'enable/disable des clés
- [ ] Snippets de code affichés:
  - **Node.js OpenAI SDK**:
    ```javascript
    import OpenAI from 'openai';
    const openai = new OpenAI({
      apiKey: 'YOUR_API_KEY',
      baseURL: 'https://pulse-sigma-eight.vercel.app/api/v1'
    });
    ```
  - **Python OpenAI SDK**:
    ```python
    from openai import OpenAI
    client = OpenAI(
      api_key="YOUR_API_KEY",
      base_url="https://pulse-sigma-eight.vercel.app/api/v1"
    )
    ```
  - **curl**:
    ```bash
    curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
      -H "Authorization: Bearer YOUR_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'
    ```
- [ ] Documentation headers attribution optionnels:
  - `x-pulse-app`: App slug ou ID
  - `x-pulse-project`: Project ID
  - `x-pulse-client`: Client ID

### F) Intégration avec PR15 Router
- [ ] Les requêtes `/api/v1/*` utilisent le router PR15 (`routeAiRequest`)
- [ ] Le router trouve le bon provider via `AiModelRoute` (priority)
- [ ] Décrypte la clé API du provider
- [ ] Appelle le provider correct
- [ ] Retourne tokens/usage correct

### G) Logging & Costing
- [ ] Chaque requête `/api/v1/chat/completions` crée `AiRequestLog`:
  - `orgId` depuis API key
  - `userId` = `key.createdByUserId`
  - `appId`/`projectId`/`clientId` depuis attribution
  - `provider`/`model` depuis router response
  - `inputTokens`/`outputTokens` corrects
  - `estimatedCostEur` calculé
- [ ] Chaque requête crée `CostEvent`:
  - `source: "AI"`
  - `resourceType: "LLM_CALL"`
  - `dimensions` avec model
  - Colonnes directes: `teamId`, `projectId`, `appId`, `clientId`

### H) Budgets & Policies
- [ ] Les budgets sont appliqués (vérifiés avant requête)
- [ ] Les policies sont appliquées (via `checkPolicies`)
- [ ] Erreurs 403 si bloqué par budget/policy

### I) Tests de bout en bout

#### Test 1: Créer clé + defaultAppId
```bash
# Via UI /developer ou API POST /api/ai/keys
# Configurer defaultAppId, defaultProjectId, rateLimitRpm=100
```

#### Test 2: Appeler /api/v1/chat/completions
```bash
curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-pulse-app: my-app" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```
- [ ] Retourne 200 avec réponse OpenAI-compatible
- [ ] `usage.prompt_tokens` > 0
- [ ] `usage.completion_tokens` > 0
- [ ] `AiRequestLog` créé avec bon appId
- [ ] `CostEvent` créé avec bon model

#### Test 3: /api/v1/models
```bash
curl https://pulse-sigma-eight.vercel.app/api/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```
- [ ] Retourne liste des modèles autorisés
- [ ] Format OpenAI-compatible

#### Test 4: Rate Limit
```bash
# Faire 101 requêtes avec rateLimitRpm=100
for i in {1..101}; do
  curl ... # même requête
done
```
- [ ] Première 100 requêtes: 200 OK
- [ ] 101ème requête: 429 Rate limit exceeded
- [ ] Headers `X-RateLimit-*` présents

#### Test 5: Attribution via headers
```bash
curl ... \
  -H "x-pulse-app: app-slug" \
  -H "x-pulse-project: project-id" \
  -H "x-pulse-client: client-id"
```
- [ ] `AiRequestLog` utilise headers (pas defaults)
- [ ] `CostEvent` utilise headers pour attribution

#### Test 6: Attribution via defaults
```bash
# Clé avec defaultAppId configuré, sans headers
curl ... # sans x-pulse-app
```
- [ ] `AiRequestLog` utilise `defaultAppId`
- [ ] `CostEvent` utilise defaults

### J) Contraintes
- [ ] Multi-tenant strict (orgId scoping partout)
- [ ] RBAC cohérent (admin/manager peuvent gérer keys)
- [ ] Pas de breaking changes sur `/api/ai/request` (existe toujours)
- [ ] TypeScript build OK (`npm run build` passe)
- [ ] Pas d'erreurs de lint

## Notes
- Les embeddings sont un placeholder pour l'instant (pas encore implémenté via providers)
- Le rate limiting est fail-soft (si DB erreur, permet la requête)
- Les snippets dans `/developer` doivent utiliser la vraie base URL (env var ou détection)

