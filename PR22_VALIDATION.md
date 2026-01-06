# PR22 Validation Checklist

## PR22 — Slack + Microsoft Teams notifications + reliable delivery + admin observability

### Pre-requisites
- Admin access to the organization
- Slack workspace (for Slack webhook URL)
- Microsoft Teams channel (for Teams webhook URL)

---

### 1. Connect Slack Integration (Admin)
- [ ] Go to `/admin/integrations/notifications`
- [ ] Paste a valid Slack webhook URL in the "Slack Webhook URL" field
- [ ] Click "Connect Slack"
- [ ] Verify that the connection shows "Connected" with last 4 characters of the webhook
- [ ] Click "Send Test" and verify a test message appears in your Slack channel
- [ ] Verify that the webhook URL is never shown in full after saving (only last 4 chars)

### 2. Connect Teams Integration (Admin)
- [ ] In the same page, paste a valid Microsoft Teams webhook URL
- [ ] Click "Connect Teams"
- [ ] Verify that the connection shows "Connected" with last 4 characters
- [ ] Click "Send Test" and verify a test message appears in your Teams channel
- [ ] Verify that the webhook URL is encrypted (not visible in DB or UI)

### 3. Enable User Preferences for Slack/Teams
- [ ] Go to `/settings/notifications` (as a non-admin user)
- [ ] Verify that Slack/Teams toggles are visible ONLY if admin has configured them
- [ ] If Slack is configured: Enable "Slack Notifications" toggle
- [ ] Click "Send test Slack" and verify the message is received
- [ ] If Teams is configured: Enable "Teams Notifications" toggle
- [ ] Click "Send test Teams" and verify the message is received
- [ ] If Slack/Teams are NOT configured: Verify that a message explains "Ask your admin to connect..."

### 4. Test Notification Delivery with Intentional Failure
- [ ] As admin, disconnect Slack (or use an invalid webhook URL temporarily)
- [ ] As user, enable Slack notifications
- [ ] Trigger an alert (e.g., create a budget and exceed it)
- [ ] Go to `/admin/notifications` (deliveries page)
- [ ] Verify that a delivery record was created with status `RETRYING` or `FAILED`
- [ ] Verify that `attempt` count is 1, and `lastError` contains an error message
- [ ] Verify that `nextRetryAt` is set (if status is RETRYING)

### 5. Verify Retry Mechanism
- [ ] Wait for the retry cron job to run (runs every 30 minutes, or trigger manually via API)
- [ ] Check `/admin/notifications` again
- [ ] Verify that the delivery record shows `attempt` count incremented
- [ ] If retry succeeds: Status should become `SENT`
- [ ] If retry fails again: Status should remain `RETRYING` or become `FAILED` after max attempts (4)
- [ ] Verify that `nextRetryAt` is updated with exponential backoff (5m, 30m, 2h, 6h)

### 6. Verify Delivery Logs and Observability
- [ ] Go to `/admin/notifications`
- [ ] Verify the deliveries table shows all notification attempts
- [ ] Use filters: Filter by status `FAILED`, verify only failed deliveries appear
- [ ] Use filters: Filter by channel `SLACK`, verify only Slack deliveries appear
- [ ] Click on a delivery row (if detail view exists) and verify error message is visible
- [ ] Verify timestamps (createdAt, updatedAt) are displayed correctly

### 7. Verify Admin Health Dashboard
- [ ] Go to `/admin/health`
- [ ] Verify that the health endpoint shows a `notificationFailures` section
- [ ] Verify `notificationFailures.byChannel` shows counts grouped by channel (e.g., `{"SLACK": 3, "TEAMS": 1}`)
- [ ] Verify `notificationFailures.total` shows total count
- [ ] Verify that `cron.RETRY_NOTIFICATIONS` shows the last retry cron run with status and timestamp

### 8. Verify Retry Cron Job
- [ ] Check `vercel.json` — verify that `/api/cron/retry-notifications` is scheduled every 30 minutes (`*/30 * * * *`)
- [ ] Manually trigger the retry endpoint (with CRON_SECRET):
  ```bash
  curl -X POST https://your-domain.com/api/cron/retry-notifications \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- [ ] Verify the response shows `success: true` and `processed` count
- [ ] Verify that a `CronRun` record was created with type `RETRY_NOTIFICATIONS`

### 9. Verify Integration with Existing Alert System
- [ ] Create a budget alert that will trigger
- [ ] Verify that notifications are sent to ALL enabled channels (Email, Telegram, Slack, Teams, In-App)
- [ ] Go to `/admin/notifications` and verify delivery records were created for each channel
- [ ] Verify that the main alert dispatch process is not blocked by notification failures (fail-soft)

### 10. Verify Security and Encryption
- [ ] Verify that webhook URLs are stored encrypted in the database (`OrgIntegration.slackWebhookUrlEnc`, `teamsWebhookUrlEnc`)
- [ ] Verify that plain webhook URLs are NEVER returned in API responses (only last 4 chars in `last4` fields)
- [ ] Verify that users cannot see or modify Slack/Teams webhook URLs (admin only)
- [ ] Verify that notification delivery logs do not expose sensitive information

---

## Expected Outcomes

✅ **Slack and Teams integrations** are fully functional with encrypted secrets  
✅ **User preferences** respect org-level configuration (Slack/Teams only available if admin configured)  
✅ **Delivery tracking** records every notification attempt with status, errors, and retry information  
✅ **Retry mechanism** automatically retries failed deliveries with exponential backoff (max 4 attempts)  
✅ **Admin observability** shows delivery logs, failures by channel, and retry cron status  
✅ **Fail-soft** behavior ensures alert dispatch is never blocked by notification failures  
✅ **Security** ensures all webhook URLs are encrypted and never exposed

---

## Notes

- The retry cron runs every 30 minutes. For testing, you can manually trigger it via the API endpoint.
- Max retry attempts is 4, with backoff: 5m, 30m, 2h, 6h.
- Failed deliveries after max attempts remain in `FAILED` status (dead-letter).
- In-app notifications are handled synchronously and marked as `SENT` immediately (no retry needed).

