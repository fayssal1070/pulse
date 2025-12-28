# AI Gateway Setup Guide

## Overview

Pulse AI Gateway provides a unified interface for AI requests with governance, cost tracking, and audit trails. All AI requests go through the gateway, which enforces policies, logs requests, and creates CostEvents for financial tracking.

## Architecture

1. **Gateway API** (`/api/ai/request`): Single entry point for all AI requests
2. **Policy Enforcement**: Allow/block models, cost limits, token limits
3. **Logging**: Every request creates `AiRequestLog` (audit trail)
4. **Cost Tracking**: Every request creates `CostEvent` (source='AI')
5. **SDK**: Internal server-side SDK (`lib/ai/sdk.ts`) for easy integration

## Setup

### 1. Configure OpenAI API Key

Set environment variable:
```bash
OPENAI_API_KEY=sk-...
```

For production, set in Vercel environment variables.

### 2. Enable AI Gateway for Organization

In Pulse UI:
1. Go to Organization Settings
2. Enable "AI Gateway"
3. Save

Or via database:
```sql
UPDATE "Organization" SET "aiGatewayEnabled" = true WHERE id = 'org-id';
```

### 3. Create API Keys (Admin Only)

1. Go to `/admin/ai`
2. Click "Create Key"
3. **IMPORTANT**: Save the API key immediately - it's only shown once
4. Use this key to authenticate requests (future: header `x-pulse-key`)

### 4. Create Policies (Admin Only)

Policies control:
- **Allowed Models**: Whitelist of allowed models (e.g., `gpt-4o-mini`, `claude-3-5-sonnet`)
- **Blocked Models**: Blacklist of blocked models (e.g., `gpt-4`, `o1-preview`)
- **Max Cost/Day**: Daily cost limit in EUR (e.g., 100.00)
- **Max Tokens/Request**: Maximum tokens per request (e.g., 10000)

Example policy:
- Name: "Production Policy"
- Allowed Models: `gpt-4o-mini, claude-3-5-sonnet`
- Blocked Models: `gpt-4, o1-preview`
- Max Cost/Day: 50.00 EUR
- Max Tokens/Request: 5000

## Usage

### Via API (Future: with API key)

```bash
curl -X POST https://your-domain.com/api/ai/request \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "model": "gpt-4o-mini",
    "prompt": "Say hello",
    "teamId": "team-123",
    "projectId": "project-456"
  }'
```

### Via Internal SDK (Server-side)

```typescript
import { aiRequest } from '@/lib/ai/sdk'

const response = await aiRequest({
  orgId: 'org-id',
  actorUserId: 'user-id',
  model: 'gpt-4o-mini',
  input: 'Say hello',
  metadata: {
    teamId: 'team-123',
    projectId: 'project-456',
    appId: 'app-789',
    taskType: 'code-review',
  },
  maxTokens: 1000,
  temperature: 0.7,
})

if (response.success) {
  console.log(response.content)
  console.log(`Cost: ${response.estimatedCostEur} EUR`)
}
```

### With Messages (Chat Format)

```typescript
const response = await aiRequest({
  orgId: 'org-id',
  actorUserId: 'user-id',
  model: 'gpt-4o-mini',
  input: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is 2+2?' },
  ],
  metadata: {
    teamId: 'team-123',
  },
})
```

## Policy Enforcement

### Model Allow/Block

- If `allowedModels` is set, only models in the list are allowed
- If `blockedModels` is set, models in the list are blocked
- If both are empty, all models are allowed (default)

### Cost Limits

- **Daily Limit**: If `maxCostPerDayEur` is set, requests are blocked if daily cost would exceed limit
- Calculation: Sum of all AI CostEvents for the org today + estimated cost of current request

### Token Limits

- **Per Request**: If `maxTokensPerReq` is set, requests exceeding this limit are blocked
- Calculation: `inputTokens + outputTokens` (estimated before API call)

### Error Responses

When a request is blocked:
```json
{
  "success": false,
  "error": "Model gpt-4 is blocked by policy \"Production Policy\""
}
```

Status code: `403 Forbidden`

## Cost Tracking

Every successful request creates:
1. **AiRequestLog**: Audit trail with prompt hash, tokens, latency, status
2. **CostEvent**: Financial record with cost, dimensions (user/team/project/app/client), model

Cost is estimated using pricing table (`lib/ai/pricing.ts`):
- Input tokens: Model-specific price per 1M tokens
- Output tokens: Model-specific price per 1M tokens
- Total: `(inputTokens / 1M) * inputPrice + (outputTokens / 1M) * outputPrice`

## Supported Models

### OpenAI
- `gpt-4o`, `gpt-4o-mini`
- `gpt-4-turbo`, `gpt-4`
- `gpt-3.5-turbo`
- `o1-preview`, `o1-mini`

### Anthropic
- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

### Google
- `gemini-pro`, `gemini-pro-vision`

### Mistral
- `mistral-large`, `mistral-medium`, `mistral-small`

## Multi-Tenant Security

- All requests are scoped to `orgId` (from active organization)
- Policies are org-scoped
- CostEvents are org-scoped
- No cross-org data leakage possible

## Audit Trail

View audit trail:
1. Go to `/admin/ai`
2. See "Recent Requests" table
3. Shows: Time, Model, Tokens, Cost, Status

Or query database:
```sql
SELECT * FROM "AiRequestLog" 
WHERE "orgId" = 'org-id' 
ORDER BY "occurredAt" DESC 
LIMIT 100;
```

## Cost Attribution

Costs are attributed via dimensions:
- `userId`: User who made the request
- `teamId`: Team (from metadata or scope)
- `projectId`: Project (from metadata or scope)
- `appId`: Application (from metadata or scope)
- `clientId`: Client (from metadata or scope)
- `model`: AI model used

View costs by dimension:
- `/costs?source=AI&teamId=team-123`
- `/costs?source=AI&projectId=project-456`
- `/costs?source=AI&model=gpt-4o-mini`

## Best Practices

1. **Always set metadata**: Include `teamId`, `projectId`, `appId` for proper cost attribution
2. **Use appropriate models**: Use cheaper models (e.g., `gpt-4o-mini`) for simple tasks
3. **Set cost limits**: Configure `maxCostPerDayEur` to prevent runaway costs
4. **Monitor usage**: Check `/admin/ai` regularly to see costs and usage
5. **Review policies**: Update policies as needs change

## Troubleshooting

### Request blocked by policy

- Check `/admin/ai` → Policies
- Verify model is in allowed list (if allowlist exists)
- Verify model is not in blocked list
- Check cost limits (daily)
- Check token limits (per request)

### High costs

- Review recent requests in `/admin/ai`
- Check which models are being used
- Consider blocking expensive models
- Set lower cost limits

### Missing cost attribution

- Ensure `metadata` includes `teamId`, `projectId`, etc.
- Check CostEvents in database: `SELECT * FROM "CostEvent" WHERE source = 'AI'`

## Next Steps

- Set up budgets based on AI costs
- Create alerts for cost spikes
- Integrate AI Gateway into your applications
- Use SDK for server-side AI requests

