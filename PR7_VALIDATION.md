# PR7 Validation Checklist

## A) Cron Proof (DB Logging)

### 1. Verify CronRunLog model has durationMs
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'CronRunLog' AND column_name = 'durationMs';
```
Expected: `durationMs` exists as `integer` nullable.

### 2. Test cron auth (401 without header)
```bash
curl -X POST "https://pulse-sigma-eight.vercel.app/api/cron/run-alerts"
```
Expected: `401 Unauthorized` with JSON error.

### 3. Test cron auth (200 with header)
```bash
curl -X POST "https://pulse-sigma-eight.vercel.app/api/cron/run-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
Expected: `200 OK` with JSON response containing `processedOrgs`, `triggered`, `sentEmail`, etc.

### 4. Verify CronRunLog entry created
After running the cron, check DB:
```sql
SELECT * FROM "CronRunLog" 
WHERE "cronName" = 'run-alerts' 
ORDER BY "ranAt" DESC 
LIMIT 1;
```
Expected: Row with `status`, `orgsProcessed`, `durationMs`, etc.

### 5. Test sync-aws-cur cron logging
```bash
curl -X POST "https://pulse-sigma-eight.vercel.app/api/cron/sync-aws-cur" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
Then verify:
```sql
SELECT * FROM "CronRunLog" 
WHERE "cronName" = 'sync-aws-cur' 
ORDER BY "ranAt" DESC 
LIMIT 1;
```

## B) Admin Ops Endpoints

### 6. GET /api/admin/ops/overview (admin only)
```bash
# Must be logged in as admin
curl "https://pulse-sigma-eight.vercel.app/api/admin/ops/overview" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```
Expected: JSON with `buildInfo`, `lastCronRunAlerts`, `lastCronRunCur`, `lastCurBatch`, `counts`.

### 7. GET /api/admin/ops/cron-runs
```bash
curl "https://pulse-sigma-eight.vercel.app/api/admin/ops/cron-runs?job=run-alerts&limit=10" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```
Expected: JSON with `runs` array and `count`.

### 8. POST /api/admin/ops/run-alerts-now (proxy)
```bash
curl -X POST "https://pulse-sigma-eight.vercel.app/api/admin/ops/run-alerts-now" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```
Expected: `200 OK` with `success: true` and `result` object.

### 9. POST /api/admin/ops/run-cur-now (proxy)
```bash
curl -X POST "https://pulse-sigma-eight.vercel.app/api/admin/ops/run-cur-now" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```
Expected: `200 OK` with `success: true` and `result` object.

## C) Admin Ops UI

### 10. Access /admin/ops page
Navigate to: `https://pulse-sigma-eight.vercel.app/admin/ops`
Expected:
- Page loads with "Operations Dashboard" title
- Shows "Deploy & Build" section with env, commit, build time
- Shows "Cron Health" section with run-alerts and sync-aws-cur status
- Shows "CUR Health" section with last batch info
- Shows "Notifications Health" section with counts
- "Run now" buttons for both crons

### 11. Click "Run now" for run-alerts
Expected:
- Button shows "Running..." while processing
- Alert shows success message
- Page reloads after 2 seconds
- New CronRunLog entry appears in DB

### 12. Click "Run now" for sync-aws-cur
Expected: Same behavior as above.

## D) Test Alert

### 13. Access /settings/notifications
Navigate to: `https://pulse-sigma-eight.vercel.app/settings/notifications`
Expected: Page shows notification preferences + "Send test alert" button.

### 14. Click "Send test alert"
Expected:
- Button shows "Sending..." while processing
- Toast shows success with channels (e.g., "in-app, email, Telegram")
- In-app notification appears in /notifications
- Email received (if emailEnabled=true)
- Telegram message received (if telegramEnabled=true and chatId set)

### 15. Verify test alert in-app notification
Navigate to: `/notifications`
Expected: Notification with title "Test Alert from Pulse" and body explaining it's a test.

### 16. Verify test alert email
Check inbox for email with subject "🧪 Test Alert from Pulse - [OrgName]"
Expected: HTML email with test message.

### 17. Verify test alert Telegram
Check Telegram for message starting with "🧪 Test Alert from Pulse"
Expected: Formatted message with test content.

## E) Security Checks

### 18. Verify CRON_SECRET not exposed
- Check browser DevTools Network tab: no `CRON_SECRET` in requests
- Check page source: no `CRON_SECRET` in HTML/JS
- Check `/admin/ops` page: no secrets visible in UI

### 19. Verify admin-only access
- Non-admin user tries to access `/admin/ops`: should see "Access denied"
- Non-admin user tries to call `/api/admin/ops/overview`: should get 403 or error

## F) Vercel Cron Configuration

### 20. Verify vercel.json
Check `vercel.json` contains:
```json
{
  "crons": [
    {
      "path": "/api/cron/run-alerts",
      "schedule": "0 */2 * * *"
    }
  ]
}
```
Expected: Cron configured to run every 2 hours.

## Summary

- ✅ All cron endpoints log to CronRunLog
- ✅ Admin Ops dashboard displays all metrics
- ✅ "Run now" buttons work via server-side proxy
- ✅ Test alert sends to all enabled channels
- ✅ No secrets exposed to client
- ✅ RBAC enforced (admin only)

