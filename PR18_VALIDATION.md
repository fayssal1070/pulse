# PR18 Validation Checklist

## Objective
Verify production-grade OpenAI compatibility: streaming, real embeddings, webhooks, responses endpoint, and usage export.

## Prerequisites
- Admin access to the organization
- At least one AI provider connection configured (OpenAI recommended for streaming/embeddings)
- At least one model route configured

## A) Streaming Support for /api/v1/chat/completions

- [ ] Test non-streaming (default behavior):
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gpt-4",
      "messages": [{"role": "user", "content": "Hello!"}]
    }'
  ```
  - Verify: JSON response with `choices[0].message.content`
  - Verify: `usage` fields present

- [ ] Test streaming (`stream=true`):
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/chat/completions \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gpt-4",
      "messages": [{"role": "user", "content": "Say hello in 5 words"}],
      "stream": true
    }'
  ```
  - Verify: Response is `text/event-stream`
  - Verify: Receives multiple `data: {...}` chunks
  - Verify: Each chunk has `object: "chat.completion.chunk"`
  - Verify: Final chunk is `data: [DONE]`
  - Verify: Chunks contain `choices[0].delta.content` with text

- [ ] Verify streaming with non-OpenAI provider (fallback):
  - Configure Anthropic/xAI/Google/Mistral route
  - Call with `stream=true`
  - Verify: Returns single chunk + DONE (fallback behavior)

- [ ] Verify logs/costs are persisted for streaming:
  - Make streaming request
  - Check `/governance/ai-logs` - verify entry exists
  - Check cost events - verify `CostEvent` created

## B) Real Embeddings for /api/v1/embeddings

- [ ] Test embeddings with OpenAI:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/embeddings \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "input": "Hello world",
      "model": "text-embedding-ada-002"
    }'
  ```
  - Verify: Response has `data[0].embedding` array
  - Verify: Embedding array length is 1536 (ada-002)
  - Verify: Values are realistic (not random)

- [ ] Test embeddings with array input:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/embeddings \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "input": ["Hello", "World"],
      "model": "text-embedding-ada-002"
    }'
  ```
  - Verify: Response has `data` array with 2 items
  - Verify: Each item has `embedding` array

- [ ] Test embeddings with non-OpenAI provider:
  - Configure Anthropic/xAI/Google/Mistral route for embeddings model
  - Call `/api/v1/embeddings`
  - Verify: 400 error with clear message: "Embeddings not supported for provider X..."

- [ ] Verify logs/costs for embeddings:
  - Make embeddings request
  - Check `/governance/ai-logs` - verify entry with `rawRef.type: "embeddings"`
  - Check cost events - verify `CostEvent` created with `resourceType: "EMBEDDINGS"`

## C) /api/v1/responses Endpoint

- [ ] Test responses endpoint (non-streaming):
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/responses \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "input": "Hello!",
      "model": "gpt-4"
    }'
  ```
  - Verify: Response has `output_text.text` field
  - Verify: Response has `usage` fields
  - Verify: Response format matches OpenAI responses API

- [ ] Test responses endpoint with array input:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/responses \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "input": [{"role": "user", "content": "Hello"}],
      "model": "gpt-4"
    }'
  ```
  - Verify: Request succeeds

- [ ] Test responses endpoint with streaming:
  ```bash
  curl https://pulse-sigma-eight.vercel.app/api/v1/responses \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
      "input": "Hello!",
      "model": "gpt-4",
      "stream": true
    }'
  ```
  - Verify: Response is `text/event-stream`
  - Verify: Receives chunks (maps to chat/completions format)

## D) Webhooks

- [ ] Create webhook via UI:
  - Go to `/admin/integrations/webhooks`
  - Click "Create Webhook"
  - Enter URL (e.g., `https://example.com/webhook`)
  - Select events: `ai_request.completed`, `cost_event.created`
  - Click "Create"
  - Verify: Webhook appears in table

- [ ] Test webhook via UI:
  - Click "Test" button on a webhook
  - Verify: Success message appears
  - Check webhook URL endpoint (if you have a test server):
    - Verify: POST request received
    - Verify: Body contains event data
    - Verify: `x-pulse-signature` header present

- [ ] Verify webhook signature:
  - Receive webhook payload
  - Verify signature using HMAC SHA256:
    ```javascript
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    // Compare with x-pulse-signature header
    ```

- [ ] Trigger real events:
  - Make an AI request via `/api/v1/chat/completions`
  - Verify: Webhook receives `ai_request.completed` event
  - Verify: Webhook receives `cost_event.created` event
  - Check webhook payload structure

- [ ] Test webhook retry logic:
  - Configure webhook to invalid URL (e.g., `https://invalid-url-that-fails.com`)
  - Trigger event
  - Verify: Webhook dispatcher retries 3 times (check logs)
  - Verify: Main request doesn't fail (fail-soft)

- [ ] Toggle webhook enabled/disabled:
  - Disable webhook via UI
  - Trigger event
  - Verify: Webhook not called
  - Enable webhook
  - Trigger event
  - Verify: Webhook called

- [ ] Delete webhook:
  - Delete webhook via UI
  - Verify: Webhook removed from list
  - Trigger event
  - Verify: Webhook not called

## E) Usage Export

- [ ] Export usage CSV:
  ```bash
  curl "https://pulse-sigma-eight.vercel.app/api/admin/usage/export?dateRange=30d" \
    -H "Authorization: Bearer <SESSION_TOKEN>" \
    # Note: This endpoint uses session auth, not API key
  ```
  - Or access via browser (admin/finance role required)
  - Verify: CSV file downloaded
  - Verify: Headers: Date, Provider, Model, Amount (EUR), Tokens, Team, Project, App, Client, User
  - Verify: Rows contain cost event data
  - Verify: Dimension names (team/project/app/client) are resolved (not just IDs)

- [ ] Test date range filter:
  ```bash
  curl "...?dateRange=7d"
  curl "...?dateRange=90d"
  curl "...?dateRange=3m"
  ```
  - Verify: Only events within range are included

- [ ] Test provider filter:
  ```bash
  curl "...?provider=openai"
  ```
  - Verify: Only OpenAI events included

- [ ] Verify RBAC:
  - Access as non-admin/non-finance user
  - Verify: 403 error or redirect

## F) Integration Checks

- [ ] Verify webhooks integrated into gateway:
  - Make AI request
  - Check webhook delivery (if configured)
  - Verify: `cost_event.created` webhook fired
  - Verify: `ai_request.completed` webhook fired

- [ ] Verify webhooks integrated into alert system:
  - Trigger an alert (e.g., budget exceeded)
  - Check webhook delivery (if configured)
  - Verify: `alert_event.triggered` webhook fired

- [ ] Verify no breaking changes:
  - Test existing `/api/ai/request` endpoint
  - Verify: Still works as before
  - Test existing `/api/v1/chat/completions` (non-streaming)
  - Verify: Still works as before

## G) TypeScript Compilation

- [ ] Run `npm run build`
- [ ] Verify: No TypeScript errors
- [ ] Verify: Build succeeds

## H) Data Test IDs (E2E Testing)

- [ ] Verify `data-testid="webhooks-page-title"` on webhooks page
- [ ] Verify `data-testid="btn-create-webhook"` on create button
- [ ] Verify `data-testid="webhook-create-form"` on form
- [ ] Verify `data-testid="webhook-{id}"` on each webhook row
- [ ] Verify `data-testid="btn-test-{id}"` on test button
- [ ] Verify `data-testid="btn-delete-{id}"` on delete button

## Notes

- Streaming must not buffer full response before sending (when supported)
- Budgets/policies must be enforced before streaming starts
- `AiRequestLog` and `CostEvent` must be written even for streaming
- Webhook errors must not break main request (fail-soft)
- All endpoints must preserve existing functionality (no breaking changes)

