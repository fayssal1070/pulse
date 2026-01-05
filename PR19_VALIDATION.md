# PR19 Validation Checklist

This document outlines the steps to validate the implementation of PR19, covering webhook hardening (encrypted secrets, delivery logs, anti-replay signatures), UI improvements, and SDK.

## Prerequisites
- An active Pulse organization with an admin user.
- At least one `OrgWebhook` configured (can be created via `/admin/integrations/webhooks`).
- Access to the database to verify encryption and delivery logs.
- `curl` or a similar HTTP client for API testing.

---

## A) Encrypted Webhook Secrets

**Objective**: Verify that webhook secrets are encrypted in the database and cannot be read in plain text.

1. **Verify Migration Applied**
   - **Check**: Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'OrgWebhook' AND column_name IN ('secretEnc', 'secretHash');`
   - **Expected Result**: Both `secretEnc` and `secretHash` columns exist.
   - **Note**: The old `secret` column may still exist for backward compatibility but should not contain new data.

2. **Create New Webhook and Verify Encryption**
   - **Action**: Create a new webhook via `/admin/integrations/webhooks` UI.
   - **Expected Result**: Webhook created successfully.
   - **Database Check**: Query `SELECT id, "secretEnc", "secretHash", secret FROM "OrgWebhook" WHERE id = '<new_webhook_id>';`
   - **Expected Result**: 
     - `secretEnc` contains an encrypted value (format: `iv:tag:encrypted` hex string).
     - `secretHash` contains a SHA-256 hash (64 hex characters).
     - `secret` column is NULL or contains deprecated data (if column still exists).

3. **Verify Secret Cannot Be Decrypted Without Key**
   - **Objective**: Confirm that secrets are encrypted using AES-GCM with key derived from `AUTH_SECRET`.
   - **Note**: Without access to `AUTH_SECRET` and `INTEGRATIONS_ENC_KEY` environment variables, secrets cannot be decrypted.

4. **Backfill Existing Secrets (if any)**
   - **Action**: If there are existing webhooks with plain-text secrets, run the backfill script: `npx tsx scripts/backfill-webhook-secrets.ts`
   - **Expected Result**: All existing secrets are encrypted and stored in `secretEnc` and `secretHash`.
   - **Verification**: Query database to confirm no webhooks have NULL `secretEnc`.

---

## B) Delivery Logs (OrgWebhookDelivery)

**Objective**: Verify that every webhook delivery is logged in the `OrgWebhookDelivery` table.

1. **Verify Table Exists**
   - **Check**: Run `SELECT COUNT(*) FROM "OrgWebhookDelivery";` (should return 0 or more).
   - **Expected Result**: Table exists and is accessible.

2. **Send Test Event**
   - **Action**: Go to `/admin/integrations/webhooks`, find a webhook, and click "Test".
   - **Expected Result**: Success message "Test event sent".
   - **Database Check**: Query `SELECT * FROM "OrgWebhookDelivery" ORDER BY "createdAt" DESC LIMIT 1;`
   - **Expected Result**: 
     - A new row exists with `eventType = 'ai_request.completed'`.
     - `status` is either `'SUCCESS'` or `'FAIL'` (depending on webhook endpoint availability).
     - `attempt` is `1`, `2`, or `3` (if retries occurred).
     - `httpStatus` contains the HTTP status code (if available).
     - `requestId` contains a unique request ID.
     - `durationMs` contains the delivery duration in milliseconds.
     - `payloadJson` may contain the payload (if stored on last attempt).

3. **Trigger Real Event**
   - **Action**: Make a successful call to `/api/v1/chat/completions` (as in PR18 validation).
   - **Expected Result**: `ai_request.completed` event is dispatched.
   - **Database Check**: Query deliveries for the webhook:
     ```sql
     SELECT * FROM "OrgWebhookDelivery" 
     WHERE "webhookId" = '<webhook_id>' 
     ORDER BY "createdAt" DESC LIMIT 10;
     ```
   - **Expected Result**: New delivery logs are created for each event type that the webhook subscribes to (`ai_request.completed`, `cost_event.created`).

4. **Verify Retry Logic**
   - **Objective**: Test that failed deliveries are retried and logged.
   - **Action**: Configure a webhook with an invalid URL (e.g., `https://invalid-url-that-fails.com/webhook`).
   - **Action**: Send a test event or trigger a real event.
   - **Database Check**: Query deliveries for this webhook.
   - **Expected Result**: 
     - Multiple delivery rows exist with the same `requestId`.
     - `attempt` values are `1`, `2`, `3`.
     - `status` is `'FAIL'` for all attempts.
     - `error` field contains error messages.

---

## C) Anti-Replay Signature

**Objective**: Verify that webhook signatures include timestamps to prevent replay attacks.

1. **Check Signature Headers**
   - **Action**: Set up a webhook receiver (e.g., webhook.site or ngrok).
   - **Action**: Send a test event.
   - **Expected Result**: The webhook receiver receives a POST request with headers:
     - `x-pulse-signature`: HMAC SHA256 signature
     - `x-pulse-event`: Event type (e.g., `ai_request.completed`)
     - `x-pulse-id`: Unique request ID
     - `x-pulse-timestamp`: Unix timestamp (seconds since epoch)
     - `Content-Type`: `application/json`

2. **Verify Signature Format**
   - **Objective**: Confirm signature is `HMAC_SHA256(secret, timestamp + "." + payload)`.
   - **Action**: Extract headers from webhook receiver:
     - `x-pulse-signature`: Signature value
     - `x-pulse-timestamp`: Timestamp value
     - Request body: JSON payload
   - **Manual Verification (Optional)**:
     - Use the webhook secret (decrypted from database) to compute: `HMAC_SHA256(secret, timestamp + "." + payload)`.
     - Compare with `x-pulse-signature` header (should match).

3. **Verify Timestamp Tolerance (Optional)**
   - **Objective**: Confirm that signatures are validated with a timestamp tolerance (e.g., 5 minutes).
   - **Note**: This validation should be done on the webhook receiver side. Pulse includes the timestamp in the signature to enable anti-replay checks.

---

## D) API Endpoints for Deliveries

**Objective**: Verify that the delivery logs API endpoints work correctly.

1. **GET /api/admin/webhooks/deliveries**
   - **Endpoint**: `GET /api/admin/webhooks/deliveries`
   - **Headers**: 
     - `Cookie`: Valid admin session
   - **Expected Result**: 
     - HTTP 200 OK.
     - JSON response: `{ deliveries: [...], total: <number>, limit: 100, offset: 0 }`.
     - `deliveries` array contains delivery objects (without `payloadJson` in list view).

2. **GET /api/admin/webhooks/deliveries?webhookId=<id>**
   - **Endpoint**: `GET /api/admin/webhooks/deliveries?webhookId=<webhook_id>`
   - **Expected Result**: Only deliveries for the specified webhook are returned.

3. **GET /api/admin/webhooks/deliveries?status=FAIL**
   - **Endpoint**: `GET /api/admin/webhooks/deliveries?status=FAIL`
   - **Expected Result**: Only failed deliveries are returned.

4. **GET /api/admin/webhooks/deliveries?eventType=ai_request.completed**
   - **Endpoint**: `GET /api/admin/webhooks/deliveries?eventType=ai_request.completed`
   - **Expected Result**: Only deliveries for `ai_request.completed` events are returned.

5. **GET /api/admin/webhooks/deliveries/[id]**
   - **Endpoint**: `GET /api/admin/webhooks/deliveries/<delivery_id>`
   - **Expected Result**: 
     - HTTP 200 OK.
     - JSON response: `{ delivery: { ... } }`.
     - `delivery` object includes `payload` (parsed JSON) if `payloadJson` was stored.
     - `delivery` includes `webhook` relation with `id`, `url`, `events`.

6. **RBAC Check**
   - **Action**: Try accessing `/api/admin/webhooks/deliveries` as a non-admin user.
   - **Expected Result**: HTTP 403 Forbidden or redirect to login.

---

## E) UI Improvements (Deliveries Tab)

**Objective**: Verify that the webhooks admin UI includes a "Deliveries" tab with filtering and detail views.

1. **Access Webhooks Page**
   - **Action**: Navigate to `/admin/integrations/webhooks`.
   - **Expected Result**: Page loads with webhook list and "Deliveries" tab.

2. **View Deliveries Tab**
   - **Action**: Click on "Deliveries" tab.
   - **Expected Result**: 
     - Table of deliveries is displayed.
     - Columns: Time, Event Type, Status, Attempt, HTTP Status, Error (preview).
     - Filters available: Status, Event Type, Date Range.

3. **Filter Deliveries**
   - **Action**: Use filters (e.g., Status = FAIL, Event Type = ai_request.completed).
   - **Expected Result**: Table updates to show only matching deliveries.

4. **View Delivery Detail**
   - **Action**: Click on a delivery row.
   - **Expected Result**: 
     - Modal or detail view shows:
       - Full payload (if stored)
       - Headers (including signature)
       - Duration
       - Error details (if failed)
       - Retry attempts

5. **Send Test Event from UI**
   - **Action**: In the webhooks list, click "Test" for a webhook.
   - **Expected Result**: 
     - Success toast.
     - New delivery appears in Deliveries tab (after refresh or auto-update).

---

## F) SDK Node (Optional, if implemented)

**Objective**: Verify that the Pulse OpenAI SDK works for making requests to Pulse's OpenAI-compatible API.

1. **Install SDK**
   - **Action**: If SDK is published as a workspace package, it should be importable.
   - **Note**: For now, SDK may be in `packages/pulse-openai` or similar.

2. **Basic Usage**
   - **Example Code**:
     ```typescript
     import { PulseOpenAI } from '@pulse/openai'
     
     const client = new PulseOpenAI({
       baseURL: 'https://your-pulse-instance.com/api/v1',
       apiKey: '<your_ai_gateway_key>',
     })
     
     const completion = await client.chat.completions.create({
       model: 'gpt-4',
       messages: [{ role: 'user', content: 'Hello!' }],
     })
     ```
   - **Expected Result**: Request succeeds and returns OpenAI-compatible response.

3. **Attribution Helper**
   - **Example Code**:
     ```typescript
     const clientWithAttribution = client.withAttribution({
       appId: 'app_123',
       projectId: 'proj_456',
       clientId: 'client_789',
     })
     
     const completion = await clientWithAttribution.chat.completions.create({
       model: 'gpt-4',
       messages: [{ role: 'user', content: 'Hello!' }],
     })
     ```
   - **Expected Result**: Request includes attribution headers (`x-pulse-app`, `x-pulse-project`, `x-pulse-client`).

---

## G) General Validation

**Objective**: Ensure that all PR19 changes work together and don't break existing functionality.

1. **No Breaking Changes**
   - **Action**: Verify that existing webhooks from PR18 still work.
   - **Expected Result**: Webhooks continue to receive events (after migration/backfill if needed).

2. **Fail-Soft Behavior**
   - **Action**: Trigger an event with a webhook that has an invalid URL.
   - **Expected Result**: 
     - Main request (e.g., `/api/v1/chat/completions`) succeeds.
     - Webhook delivery failures are logged but don't break the main request.

3. **Performance**
   - **Action**: Send multiple events in quick succession.
   - **Expected Result**: 
     - Delivery logs are created asynchronously (non-blocking).
     - No noticeable performance degradation in main request flow.

---

## Summary

PR19 adds production-grade hardening to webhooks:
- ✅ Encrypted secrets (AES-GCM)
- ✅ Delivery logs with retry tracking
- ✅ Anti-replay signatures (timestamp-based)
- ✅ API endpoints for delivery observability
- ⏳ UI improvements (Deliveries tab) - *May be implemented incrementally*
- ⏳ Node SDK - *May be implemented incrementally*

The core functionality (A, B, C, D) is required for PR19. UI improvements (E) and SDK (F) are enhancements that can be added incrementally.

