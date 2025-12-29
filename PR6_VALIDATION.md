# PR6 Validation Checklist

## Overview
PR6 implements automatic alert dispatch with notifications (email, Telegram, in-app).

## Database Migration
- [x] `NotificationPreference` model added
- [x] `OrgIntegration` model added
- [x] Migration applied via `prisma db push`

## Services
- [x] `lib/notifications/email.ts` - Resend API integration
- [x] `lib/notifications/telegram.ts` - Telegram bot integration
- [x] `lib/notifications/format.ts` - Alert message formatting
- [x] `lib/notifications/encryption.ts` - AES-GCM encryption for bot tokens
- [x] `lib/alerts/dispatch.ts` - Alert dispatch engine with cooldown/dedup

## API Routes
- [x] `POST /api/cron/run-alerts` - Cron job (every 2h)
- [x] `GET /api/notifications` - List in-app notifications
- [x] `POST /api/notifications` - Mark all as read
- [x] `PATCH /api/notifications/[id]` - Mark one as read
- [x] `GET /api/settings/notifications` - Get user preferences
- [x] `POST /api/settings/notifications` - Update user preferences
- [x] `GET /api/admin/integrations/telegram` - Get Telegram integration status
- [x] `POST /api/admin/integrations/telegram` - Set bot token
- [x] `DELETE /api/admin/integrations/telegram` - Remove bot token

## UI Pages
- [x] `/notifications` - In-app notifications list (updated)
- [x] `/settings/notifications` - User notification preferences
- [x] `/admin/integrations` - Admin Telegram bot configuration

## Vercel Configuration
- [x] `vercel.json` updated with cron schedule `0 */2 * * *`

## Manual Testing Steps

### 1. Setup Telegram Bot
1. Create a bot via @BotFather on Telegram
2. Get bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
3. As admin, go to `/admin/integrations`
4. Configure bot token
5. Verify token is encrypted and stored

### 2. Configure User Preferences
1. Go to `/settings/notifications`
2. Enable email notifications (default: enabled)
3. Enable Telegram notifications
4. Enter Telegram Chat ID (get from @userinfobot or bot response)
5. Save preferences

### 3. Create Alert Trigger
1. Create a budget with low threshold (e.g., €10)
2. Ensure budget is enabled
3. Create cost events that exceed threshold
4. Wait for cron to run (or trigger manually)

### 4. Manual Cron Trigger
```bash
curl -X POST https://your-app.vercel.app/api/cron/run-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5. Verify Notifications
- [ ] AlertEvent created in database
- [ ] InAppNotification created
- [ ] Email sent (if emailEnabled=true)
- [ ] Telegram message sent (if telegramEnabled=true and bot token configured)
- [ ] Cooldown respected (no duplicate alerts within cooldown period)

### 6. Verify UI
- [ ] `/notifications` shows in-app notifications
- [ ] "Mark all as read" button works
- [ ] Individual "Mark as read" buttons work
- [ ] `/settings/notifications` shows current preferences
- [ ] Preferences can be updated

### 7. Verify Admin
- [ ] `/admin/integrations` accessible only to admins
- [ ] Bot token can be set/updated/removed
- [ ] Token is encrypted (check database)
- [ ] Only last 4 chars displayed

## Environment Variables Required
- `CRON_SECRET` - For cron authentication
- `RESEND_API_KEY` - For email sending (optional, fail soft if missing)
- `EMAIL_FROM` - Email sender address (default: noreply@pulse.app)
- `AUTH_SECRET` - For encryption key derivation
- `INTEGRATIONS_ENC_KEY` - Optional salt for encryption (defaults to constant)

## Known Limitations
- Email service fails soft if RESEND_API_KEY not configured
- Telegram requires bot token to be configured per org
- Cooldown is per AlertRule (not per alert type)
- Dedup checks last hour only (simple implementation)

## Next Steps (Future PRs)
- Add email templates with better styling
- Add webhook notifications
- Add notification history/audit log
- Add notification preferences per alert type
- Add rate limiting for notifications

