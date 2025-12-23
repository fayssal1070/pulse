# AWS Cost Explorer Sync - Test Plan

## Overview
This test plan validates the AWS Cost Explorer sync functionality locally and on Vercel.

## Prerequisites

### Local Testing
- Node.js 20+ installed
- PostgreSQL database running (local or remote)
- AWS account with Cost Explorer access
- AWS IAM role configured (see `AWS_CONNECTION_SETUP.md`)
- Environment variables set:
  - `DATABASE_URL`
  - `CRON_SECRET` (for cron endpoint testing)

### Vercel Testing
- Vercel project deployed
- Environment variables configured:
  - `DATABASE_URL`
  - `CRON_SECRET`
  - Vercel Cron Job configured (see Vercel setup section)

## Test Cases

### Test 1: Database Schema Migration
**Objective**: Verify CloudAccount model supports AWS Cost Explorer fields

**Steps**:
1. Run migration: `npx prisma migrate deploy`
2. Verify schema: `npx prisma studio` or query database
3. Check fields exist:
   - `connectionType`
   - `roleArn`
   - `externalId`
   - `lastSyncedAt`
   - `lastSyncError`

**Expected Result**: All fields exist in CloudAccount table

---

### Test 2: Create AWS Cost Explorer Account (Manual)
**Objective**: Verify CloudAccount can be created with AWS Cost Explorer connection

**Steps**:
1. Create CloudAccount via API or database:
   ```sql
   INSERT INTO "CloudAccount" (
     id, "orgId", provider, "accountName", "connectionType", 
     "roleArn", "externalId", status, "createdAt"
   ) VALUES (
     'test-aws-1', 'YOUR_ORG_ID', 'AWS', 'Test AWS Account',
     'COST_EXPLORER', 'arn:aws:iam::123456789012:role/PULSE-CostExplorer-Role',
     'test-external-id-123', 'pending', NOW()
   );
   ```

2. Verify account created with correct fields

**Expected Result**: CloudAccount created with `connectionType='COST_EXPLORER'`

---

### Test 3: Manual Sync Endpoint (Local)
**Objective**: Test manual sync via API endpoint

**Steps**:
1. Start local server: `npm run dev`
2. Create AWS Cost Explorer account (via API or DB)
3. Call sync endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/cloud-accounts/TEST_ACCOUNT_ID/sync \
     -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
     -H "Content-Type: application/json"
   ```

4. Check response:
   ```json
   {
     "success": true,
     "recordsCount": 150,
     "totalAmount": 1234.56,
     "services": ["EC2", "S3", "Lambda", ...]
   }
   ```

5. Verify database:
   ```sql
   SELECT COUNT(*) FROM "CostRecord" WHERE "orgId" = 'YOUR_ORG_ID' AND provider = 'AWS';
   SELECT * FROM "CloudAccount" WHERE id = 'TEST_ACCOUNT_ID';
   -- Check lastSyncedAt is updated
   ```

**Expected Result**:
- Sync succeeds
- Cost records created in database
- `lastSyncedAt` updated
- `status` = 'active'

---

### Test 4: Rate Limiting (Local)
**Objective**: Verify rate limiting prevents multiple syncs within 15 minutes

**Steps**:
1. Call sync endpoint (should succeed)
2. Immediately call again (should fail with 429)
3. Wait 15 minutes, call again (should succeed)

**Expected Result**:
- First call: 200 OK
- Second call (immediate): 429 Rate Limit Exceeded
- Third call (after 15 min): 200 OK

---

### Test 5: Error Handling (Local)
**Objective**: Verify errors are handled gracefully

**Test 5a: Invalid Role ARN**
1. Create account with invalid Role ARN
2. Call sync endpoint
3. Check response and database

**Expected Result**:
- Sync fails with error message
- `lastSyncError` stored in database
- `status` = 'error'
- No crash

**Test 5b: Invalid External ID**
1. Create account with wrong External ID
2. Call sync endpoint
3. Check response

**Expected Result**:
- Sync fails with "Access Denied" or similar
- Error stored in `lastSyncError`
- No crash

**Test 5c: Missing Required Fields**
1. Create account without `roleArn` or `externalId`
2. Call sync endpoint

**Expected Result**:
- Sync fails with "Missing roleArn or externalId"
- Error stored

---

### Test 6: Cron Job (Local)
**Objective**: Test daily cron job endpoint

**Steps**:
1. Create multiple AWS Cost Explorer accounts
2. Call cron endpoint:
   ```bash
   curl -X GET http://localhost:3000/api/cron/sync-aws-costs \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. Check response:
   ```json
   {
     "success": true,
     "syncedAccounts": 3,
     "successfulSyncs": 2,
     "totalRecords": 300,
     "results": [...]
   }
   ```

4. Verify all accounts synced (or errors logged)

**Expected Result**:
- All accounts processed
- Successful syncs counted
- Errors logged but don't stop other syncs
- Total records imported

---

### Test 7: Cron Job (Vercel)
**Objective**: Test cron job on Vercel

**Prerequisites**:
- Vercel project deployed
- Vercel Cron Job configured (see Vercel setup)

**Steps**:
1. Configure Vercel Cron Job (see Vercel setup section)
2. Wait for scheduled run (or trigger manually)
3. Check Vercel logs
4. Verify database updated

**Expected Result**:
- Cron job runs at scheduled time
- Logs show sync results
- Database updated with new cost records

---

### Test 8: Dashboard Display (Local)
**Objective**: Verify dashboard shows synced data

**Steps**:
1. Sync AWS costs (via manual endpoint)
2. Navigate to dashboard: `http://localhost:3000/dashboard`
3. Check:
   - Total costs displayed
   - Cost records visible
   - "Last synced" timestamp shown (if UI implemented)
   - Services listed

**Expected Result**:
- Dashboard shows AWS cost data
- Charts/graphs populated
- Services visible

---

### Test 9: Multiple Organizations (Local)
**Objective**: Verify sync works for multiple organizations

**Steps**:
1. Create Org A with AWS account
2. Create Org B with AWS account
3. Sync both
4. Verify data isolated per organization

**Expected Result**:
- Each org's costs synced independently
- No cross-org data leakage
- Correct `orgId` in all CostRecords

---

### Test 10: Large Dataset (Local)
**Objective**: Test sync with large amount of cost data

**Steps**:
1. Use AWS account with 30+ days of cost data
2. Sync costs
3. Verify all records imported
4. Check performance (should complete in < 30 seconds)

**Expected Result**:
- All cost records imported
- No timeouts
- Database queries efficient

---

## Vercel Setup

### 1. Configure Environment Variables
In Vercel dashboard, add:
- `CRON_SECRET`: Random secret string (e.g., `openssl rand -hex 32`)

### 2. Configure Vercel Cron Job
Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-aws-costs",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Note**: Vercel cron uses UTC. `0 6 * * *` = 06:00 UTC = 07:00 Europe/Brussels (CET) or 08:00 (CEST).

For 06:00 Europe/Brussels:
- CET (winter): `0 5 * * *` (05:00 UTC)
- CEST (summer): `0 4 * * *` (04:00 UTC)

**Alternative**: Use a service like EasyCron or cron-job.org to call the endpoint at the correct time.

### 3. Deploy
```bash
git add vercel.json
git commit -m "Add Vercel cron job for AWS cost sync"
git push
```

### 4. Test Cron Job
After deployment:
1. Go to Vercel dashboard → Project → Settings → Cron Jobs
2. Verify cron job listed
3. Wait for scheduled run or trigger manually
4. Check logs

---

## Manual Sync Commands

### Local
```bash
# Get session token (after logging in)
# Then:
curl -X POST http://localhost:3000/api/cloud-accounts/ACCOUNT_ID/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Vercel
```bash
# Get session token from browser dev tools
# Then:
curl -X POST https://YOUR_VERCEL_URL/api/cloud-accounts/ACCOUNT_ID/sync \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

---

## Expected Dashboard Behavior

After successful sync:
1. **Cost Records**: Dashboard shows AWS costs in totals, charts, and service breakdowns
2. **Last Synced**: (If UI implemented) Shows "Last synced: 2 hours ago" or timestamp
3. **Sync Button**: (If UI implemented) "Sync now" button with rate limit indicator
4. **Alerts**: Alert rules can trigger based on synced cost data

---

## Troubleshooting

### Sync Fails with "Access Denied"
- Check Role ARN format
- Verify External ID matches trust policy
- Ensure permissions policy attached to role

### Sync Returns 0 Records
- Verify AWS account has cost data
- Check date range (last 30 days)
- Ensure Cost Explorer API enabled

### Cron Job Not Running
- Verify `vercel.json` configured
- Check Vercel cron job status
- Verify `CRON_SECRET` matches Authorization header

### Database Errors
- Check `DATABASE_URL` is correct
- Verify Prisma migrations applied
- Check database connection limits

---

## Success Criteria

✅ All test cases pass
✅ Manual sync works locally and on Vercel
✅ Cron job runs daily and syncs all accounts
✅ Errors handled gracefully (no crashes)
✅ Rate limiting prevents abuse
✅ Dashboard displays synced data
✅ Multiple organizations isolated correctly

---

## Next Steps After Testing

1. Implement UI for AWS connection setup (wizard)
2. Add "Last synced" display in dashboard
3. Add "Sync now" button with rate limit indicator
4. Add error notifications for failed syncs
5. Add sync history/logs

