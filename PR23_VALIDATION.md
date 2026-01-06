# PR23 Validation Checklist

## PR23 — API Keys V2 (self-serve) + scopes + defaults attribution + rotation + observability

### Pre-requisites
- Admin/finance/manager access to the organization
- At least one App, Project, Client, Team created in the directory

---

### 1. Create API Key with Defaults
- [ ] Go to `/admin/api-keys`
- [ ] Click "Create API Key"
- [ ] Fill in:
  - Label: "Test Key"
  - Default App: Select an app from dropdown
  - Rate Limit: 60
- [ ] Click "Create"
- [ ] Verify secret is shown and copied to clipboard
- [ ] Verify message says "Save it now - it will not be shown again"
- [ ] Verify key appears in table with status "Active"

### 2. Use API Key and Verify lastUsedAt Updated
- [ ] Copy the API key secret from step 1
- [ ] Make a request to `/api/v1/models`:
  ```bash
  curl -X GET https://your-domain.com/api/v1/models \
    -H "Authorization: Bearer YOUR_API_KEY"
  ```
- [ ] Verify request succeeds (returns 200 with models list)
- [ ] Go back to `/admin/api-keys`
- [ ] Refresh the page
- [ ] Verify the key's "Last Used" column shows a recent timestamp (within last minute)

### 3. Test Model Restrictions (Blocked Models)
- [ ] Go to `/admin/api-keys`
- [ ] Create a new API key (or edit existing) with:
  - Blocked Models: `gpt-4`
- [ ] Save the key
- [ ] Try to use the key with a blocked model:
  ```bash
  curl -X POST https://your-domain.com/api/v1/chat/completions \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'
  ```
- [ ] Verify request returns 403 with error: "Model gpt-4 is blocked by API key restrictions"

### 4. Test Default Attribution
- [ ] Create a new API key with:
  - Default App: Select an app
  - Default Project: Select a project
- [ ] Use the key to make a request WITHOUT attribution headers:
  ```bash
  curl -X POST https://your-domain.com/api/v1/chat/completions \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "Hello"}]}'
  ```
- [ ] Go to `/costs` or check CostEvent in database
- [ ] Verify the CostEvent has `appId` and `projectId` set from key defaults

### 5. Test Daily Cost Limit
- [ ] Create a new API key with:
  - Daily Cost Limit: 0.01 EUR (very low for testing)
- [ ] Make several requests using this key until you hit the limit
- [ ] Verify that a request returns 403 with error: "Daily cost limit of €0.01 exceeded"
- [ ] Verify the error message shows current cost

### 6. Rotate API Key
- [ ] Go to `/admin/api-keys`
- [ ] Find an active key and click the rotate icon (rotate arrow)
- [ ] Confirm the rotation dialog
- [ ] Verify new secret is shown and copied to clipboard
- [ ] Verify old key stops working (try using old key, should return 401)
- [ ] Verify new key works (try using new key, should return 200)
- [ ] Verify key prefix in table is updated

### 7. Revoke API Key
- [ ] Go to `/admin/api-keys`
- [ ] Find an active key and click the revoke icon (trash)
- [ ] Confirm the revocation
- [ ] Verify key status changes to "Revoked"
- [ ] Verify revoked key stops working (should return 401)

### 8. Verify Admin Health Dashboard
- [ ] Go to `/admin/health`
- [ ] Scroll to "API Keys" section
- [ ] Verify it shows:
  - Active keys count
  - Revoked keys count
  - Never used keys count
  - Oldest usage timestamp
  - Newest usage timestamp
- [ ] Scroll to "Recent API Key Audits" section
- [ ] Verify it shows last 20 audit log entries with:
  - Action type (CREATE, ROTATE, REVOKE, UPDATE)
  - Timestamp
  - Key ID

### 9. Verify /connect Page Links
- [ ] Go to `/connect`
- [ ] Verify the page shows link to `/admin/api-keys` for creating keys
- [ ] If no keys exist, verify message: "Create an API key to get started"
- [ ] Verify snippets show `Authorization: Bearer <API_KEY>` format

### 10. Verify RBAC (Optional - if you have finance/manager users)
- [ ] As finance/manager user, go to `/admin/api-keys`
- [ ] Verify you can create keys
- [ ] Verify you can rotate/revoke only your own keys (not others')
- [ ] As regular user, verify you cannot access `/admin/api-keys` (redirects with error)

---

## Expected Outcomes

✅ **API keys can be created** with label, defaults, restrictions, and limits  
✅ **lastUsedAt is updated** automatically on each request  
✅ **Model restrictions work** (allowed/blocked models)  
✅ **Default attribution** is applied when headers are missing  
✅ **Cost limits** block requests when exceeded with clear errors  
✅ **Key rotation** generates new secret and invalidates old one  
✅ **Key revocation** immediately stops key from working  
✅ **Admin health** shows API key stats and audit trail  
✅ **/connect page** links to key creation  
✅ **RBAC** enforces proper permissions

---

## Notes

- Secrets are shown only once on creation/rotation. Make sure to save them!
- Cost limits check org-wide costs for simplicity. Per-key cost tracking could be added later.
- Audit logs track all key actions (CREATE, ROTATE, REVOKE, UPDATE).
- Keys expire based on `expiresAt` field (not tested in this checklist but implemented).

