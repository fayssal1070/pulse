# PR17 Validation Checklist

## Objective
Verify OpenAI-compatible proxy endpoints and Developer Connect page functionality.

## Prerequisites
- Admin access to the organization
- At least one AI provider connection configured (via `/admin/integrations/ai`)
- At least one model route configured

## 1. API Key Creation
- [ ] Go to `/admin/ai` (or `/developer`)
- [ ] Create a new `AiGatewayKey`
- [ ] Copy the API key (shown only once)
- [ ] Verify the key appears in the keys list
- [ ] Optionally set `defaultAppId`, `defaultProjectId`, `defaultClientId` on the key

## 2. Provider Connection Setup
- [ ] Go to `/admin/integrations/ai`
- [ ] Connect at least one AI provider (OpenAI, Anthropic, etc.)
- [ ] Test the connection (should return `{ ok: true, latencyMs: ... }`)
- [ ] Create at least one model route (e.g., `gpt-4` -> OpenAI)

## 3. GET /api/v1/models
- [ ] Call: `curl https://pulse-sigma-eight.vercel.app/api/v1/models -H "Authorization: Bearer <API_KEY>"`
- [ ] Verify response: `{ object: "list", data: [...] }`
- [ ] Verify models list includes configured model routes
- [ ] Verify each model has correct `id`, `object`, `owned_by` fields

## 4. POST /api/v1/chat/completions - Basic Request
- [ ] Call:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gpt-4",
      "messages": [{"role": "user", "content": "Hello!"}]
    }'
  ```
- [ ] Verify response: `{ id, object: "chat.completion", choices: [...], usage: {...} }`
- [ ] Verify `choices[0].message.content` contains response text
- [ ] Verify `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` are present

## 5. POST /api/v1/chat/completions - With Attribution Headers
- [ ] Call with `x-pulse-app` header:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -H "x-pulse-app: <app-id>" \
    -d '{
      "model": "gpt-4",
      "messages": [{"role": "user", "content": "Test"}]
    }'
  ```
- [ ] Verify request succeeds
- [ ] Check `/governance/ai-logs` - verify log entry has correct `appId`

## 6. POST /api/v1/chat/completions - x-api-key Header
- [ ] Call with `x-api-key` header (instead of Authorization):
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
    -H "x-api-key: <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gpt-4",
      "messages": [{"role": "user", "content": "Test"}]
    }'
  ```
- [ ] Verify request succeeds (same as Authorization header)

## 7. Error Handling - Missing API Key
- [ ] Call without API key:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Test"}]}'
  ```
- [ ] Verify 401 response: `{ error: "Missing API key..." }`

## 8. Error Handling - Invalid API Key
- [ ] Call with invalid API key:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
    -H "Authorization: Bearer invalid-key-123" \
    -H "Content-Type: application/json" \
    -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Test"}]}'
  ```
- [ ] Verify 401 response: `{ error: "Invalid or inactive API key" }`

## 9. Error Handling - No Provider for Model
- [ ] Call with model that has no route:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"model": "non-existent-model", "messages": [{"role": "user", "content": "Test"}]}'
  ```
- [ ] Verify 400 response with clear message: "No provider connected for model..."

## 10. Logging and Cost Tracking
- [ ] Make a successful chat completion request
- [ ] Go to `/governance/ai-logs`
- [ ] Verify `AiRequestLog` entry exists with:
  - Correct `orgId`, `userId`, `model`, `provider`
  - `inputTokens`, `outputTokens`, `totalTokens`
  - `estimatedCostEur`
  - `statusCode: 200`
- [ ] Check cost events (via `/costs` or database)
- [ ] Verify `CostEvent` created with:
  - `source: "AI"`
  - Correct `amountEur`
  - `provider`, `model` in dimensions
  - Attribution dimensions (if headers provided)

## 11. Rate Limiting (if configured)
- [ ] Set `rateLimitRpm` on API key (e.g., 10)
- [ ] Make 11 requests within 60 seconds
- [ ] Verify 11th request returns 429: `{ error: { message: "Rate limit exceeded", code: "rate_limit_exceeded" } }`
- [ ] Verify `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers present

## 12. requireAttribution Policy Enforcement
- [ ] Enable `requireAttribution` policy in `/admin/ai` (policies section)
- [ ] Call `/api/v1/chat/completions` without `x-pulse-app` header and no `defaultAppId` on key
- [ ] Verify 400 response: `{ error: { message: "appId required by policy...", code: "policy_requirement" } }`
- [ ] Call with `x-pulse-app` header
- [ ] Verify request succeeds

## 13. Developer Connect Page (/connect)
- [ ] Go to `/connect`
- [ ] Verify page loads without errors
- [ ] Verify "Base URL" section shows: `https://pulse-sigma-eight.vercel.app/api/v1`
- [ ] Click "Copy" button on Base URL - verify clipboard contains correct URL
- [ ] Verify "API Key" section shows link to create key (if no keys) or manage keys link
- [ ] Verify code snippets section includes:
  - [ ] cURL
  - [ ] Node.js (fetch)
  - [ ] Python (requests)
  - [ ] OpenAI SDK (Node.js)
  - [ ] Vercel AI SDK
  - [ ] LangChain
- [ ] Verify snippets use correct `baseURL` and placeholder for API key
- [ ] Verify attribution headers section explains `x-pulse-app`, `x-pulse-project`, `x-pulse-client`, `x-pulse-team`
- [ ] Verify Quick Links section has links to:
  - [ ] Manage API Keys (`/admin/ai`)
  - [ ] AI Integrations (`/admin/integrations/ai`)
  - [ ] Developer Portal (`/developer`)
  - [ ] AI Logs (`/governance/ai-logs`)

## 14. Data Test IDs (E2E Testing)
- [ ] Verify `data-testid="connect-page-title"` on page title
- [ ] Verify `data-testid="base-url-section"` on base URL section
- [ ] Verify `data-testid="copy-base-url-btn"` on copy button
- [ ] Verify `data-testid="api-key-section"` on API key section
- [ ] Verify `data-testid="copy-api-key-btn"` on copy button (if keys exist)
- [ ] Verify `data-testid="create-api-key-btn"` on create button (if no keys)
- [ ] Verify `data-testid="manage-api-keys-link"` on manage link
- [ ] Verify `data-testid="code-snippets-section"` on code snippets section
- [ ] Verify `data-testid="attribution-headers-section"` on attribution headers section

## 15. Budget Enforcement
- [ ] Create a budget with limit (e.g., 10 EUR) for the organization
- [ ] Make requests that exceed the budget
- [ ] Verify requests are blocked (403) with appropriate error message
- [ ] Verify budget enforcement works with OpenAI-compatible endpoints

## 16. POST /api/v1/embeddings (Optional)
- [ ] Call:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/embeddings \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"input": "Hello world", "model": "text-embedding-ada-002"}'
  ```
- [ ] Verify response: `{ object: "list", data: [{ embedding: [...] }], usage: {...} }`
- [ ] Note: Embeddings endpoint may be a placeholder - verify behavior matches implementation

## 17. TypeScript Compilation
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Verify build succeeds

## 18. Multi-tenancy Verification
- [ ] Create API key in Org A
- [ ] Verify key only works for Org A's models/routes
- [ ] Create API key in Org B
- [ ] Verify Org B's key cannot access Org A's data
- [ ] Verify logs are correctly scoped to organization

## Notes
- All endpoints should preserve existing `/api/ai/request` functionality (no breaking changes)
- Rate limiting should fail-soft (allow requests if DB error)
- Cost tracking must never be skipped (always log, even on errors)
