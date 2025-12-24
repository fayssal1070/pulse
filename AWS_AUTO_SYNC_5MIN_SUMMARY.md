# AWS Auto-Sync Every 5 Minutes - Implementation Summary

## Files Changed

### Configuration
1. ✅ `vercel.json` - **MODIFIED**
   - Updated cron schedule from `0 5 * * *` (daily) to `*/5 * * * *` (every 5 minutes)

### Database Schema
2. ✅ `prisma/schema.prisma` - **MODIFIED**
   - Added `JobLock` model for preventing parallel cron runs
   - Fields: `id` (String, @id, default "aws-cost-sync"), `lockedUntil` (DateTime), `createdAt`, `updatedAt`

3. ✅ `prisma/migrations/20251224143307_add_job_lock/migration.sql` - **NEW**
   - Migration to create JobLock table

### Configuration & Lock System
4. ✅ `lib/aws-sync-config.ts` - **NEW**
   - Environment variable defaults:
     - `SYNC_INTERVAL_MINUTES` (default: 5)
     - `SYNC_LOCK_TTL_SECONDS` (default: 240 = 4 minutes)
     - `MAX_ACCOUNTS_PER_RUN` (default: 10)
     - `AWS_SYNC_LOOKBACK_DAYS` (default: 30)

5. ✅ `lib/job-lock.ts` - **NEW**
   - `acquireJobLock()` - Acquires lock if not already held
   - `releaseJobLock()` - Releases lock immediately
   - `isLocked()` - Checks if lock is currently held

### Sync Pipeline
6. ✅ `lib/aws-sync-pipeline.ts` - **MODIFIED**
   - Uses `SYNC_CONFIG.AWS_SYNC_LOOKBACK_DAYS` instead of hardcoded 30 days

### Cron Job
7. ✅ `app/api/cron/sync-aws-costs/route.ts` - **MODIFIED**
   - Acquires job lock before running (skips if already locked)
   - Skips accounts synced within last 5 minutes
   - Limits to `MAX_ACCOUNTS_PER_RUN` accounts per run
   - Releases lock in `finally` block

### UI
8. ✅ `app/organizations/[id]/cloud-accounts/page.tsx` - **MODIFIED**
   - Added "Auto-sync: every 5 minutes" display for COST_EXPLORER accounts
   - Enhanced status display with color coding
   - Shows `lastSyncedAt` / `lastSyncError` / `status` clearly

## Environment Variables (Optional)

These have defaults in code, but can be overridden in Vercel:

- `SYNC_INTERVAL_MINUTES` (default: 5)
- `SYNC_LOCK_TTL_SECONDS` (default: 240)
- `MAX_ACCOUNTS_PER_RUN` (default: 10)
- `AWS_SYNC_LOOKBACK_DAYS` (default: 30)

## How It Works

### Cron Schedule
- **Vercel Cron**: Runs every 5 minutes (`*/5 * * * *`)
- **Endpoint**: `/api/cron/sync-aws-costs`
- **Authorization**: Requires `Authorization: Bearer CRON_SECRET`

### Lock Mechanism
1. Cron job calls `acquireJobLock()`
2. Checks if lock exists and `lockedUntil > now`
3. If locked → returns `{skipped: true}` immediately
4. If not locked → acquires lock with TTL (4 minutes)
5. Runs sync for accounts that need it
6. Releases lock in `finally` block

### Account Selection
- Only syncs accounts where:
  - `provider = 'AWS'`
  - `connectionType = 'COST_EXPLORER'`
  - `status IN ('active', 'pending', 'error')`
  - `lastSyncedAt IS NULL` OR `lastSyncedAt < (now - 5 minutes)`
- Limits to `MAX_ACCOUNTS_PER_RUN` (10) per run
- Orders by `lastSyncedAt ASC` (syncs oldest first)

### UI Display
- **Auto-sync**: Shows "Auto-sync: every 5 minutes" for COST_EXPLORER accounts
- **Status**: Color-coded badge (ACTIVE=green, ERROR=red, PENDING=yellow)
- **Last synced**: Relative time (e.g., "2 minutes ago", "1 hour ago")
- **Last error**: Red text showing error message if sync failed

## Verification

### Lock Prevention
- ✅ Lock acquired before sync starts
- ✅ Lock released in `finally` block (even on error)
- ✅ Parallel runs skip if lock exists
- ✅ Lock TTL prevents stuck locks (4 minutes)

### Skip Logic
- ✅ Accounts synced within last 5 minutes are skipped
- ✅ Query uses `OR` condition: `lastSyncedAt IS NULL OR lastSyncedAt < threshold`
- ✅ Orders by `lastSyncedAt ASC` to prioritize unsynced accounts

### UI Updates
- ✅ "Auto-sync: every 5 minutes" displayed
- ✅ Status, lastSyncedAt, lastSyncError all visible
- ✅ Color-coded status badges

## Git Commands

If repository is set up:
```bash
git add .
git commit -m "Set AWS auto-sync to run every 5 minutes with job lock and skip logic"
git push
```

If repository is not set up:
```bash
git init
git add .
git commit -m "Set AWS auto-sync to run every 5 minutes with job lock and skip logic"
git remote add origin <your-repo-url>
git push -u origin main
```

---

**Status**: ✅ **AWS AUTO-SYNC EVERY 5 MINUTES COMPLETE**

**Cron Schedule**: `*/5 * * * *` (every 5 minutes)

**Lock Protection**: ✅ Prevents parallel runs

**Skip Logic**: ✅ Skips accounts synced within last 5 minutes

**UI Display**: ✅ Shows auto-sync frequency and sync status

