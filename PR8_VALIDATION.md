# PR8 Validation - Governance & Audit IA

## Overview
This document describes how to validate the governance page implementation with AI request logs, filters, export, retention settings, and cron job.

## Prerequisites
- User must be authenticated
- User must have an active organization
- AiRequestLog entries should exist in the database
- CRON_SECRET environment variable must be set

## Test Cases

### 1. Access the Governance Page
**URL:** `/governance`

**Expected:**
- Page loads without errors
- Header shows "Governance" title and subtitle
- Two tabs: "AI Request Logs" and "Retention"
- Export CSV button visible (in logs tab)
- Filters section visible
- KPI cards show: Requests, Total Cost, Avg Latency, Error Rate
- Logs table shows paginated AI request logs

**Validation:**
```bash
# Check page loads
curl -I https://your-domain.com/governance
```

### 2. Test RBAC (Role-Based Access Control)

#### 2.1 Admin/Finance/Manager
**Expected:**
- Can see all AI request logs for the org
- Can export all logs
- Can view retention settings
- Can update retention settings (admin/finance only)

**Test:**
1. Login as admin/finance/manager
2. Navigate to `/governance`
3. Verify all logs visible
4. Verify can export
5. Verify can view retention tab
6. If admin/finance: verify can update retention

#### 2.2 User Role
**Expected:**
- Can only see their own AI request logs (filtered by userId)
- Can export only their logs
- Can view retention settings but cannot update

**Test:**
1. Login as regular user
2. Navigate to `/governance`
3. Verify only logs with `userId === currentUserId` are shown
4. Export CSV and verify only user's logs included
5. Verify retention tab shows read-only

**Validation:**
```bash
# Test API with user role
# Should only return logs where userId === user.id
curl -H "Cookie: user-auth-cookie" \
  "https://your-domain.com/api/governance/ai-logs?dateRange=last30"
```

### 3. Test Filters

#### 3.1 Date Range Filter
- Select "Last 7 days" → Logs should filter to last 7 days
- Select "Month to Date" → Logs should filter to current month
- Select "Custom" → Start Date and End Date inputs appear
- Set custom dates → Logs should filter to date range

#### 3.2 Provider Filter
- Type "openai" → Only OpenAI logs shown
- Type "anthropic" → Only Anthropic logs shown
- Clear → All providers shown

#### 3.3 Model Filter
- Type "gpt-4" → Only GPT-4 logs shown
- Clear → All models shown

#### 3.4 Status Code Filter
- Select "2xx" → Only successful requests shown
- Select "4xx" → Only client errors shown
- Select "5xx" → Only server errors shown
- Select "All" → All status codes shown

#### 3.5 Search Filter
- Type text → Logs filtered by provider/model/userId/appId/projectId/clientId

**Validation:**
- URL should update with query parameters
- Data should refresh when filters change
- Loading states should appear during fetch

### 4. Test KPI Cards

**Expected:**
- Requests: Total count of logs in date range
- Total Cost: Sum of estimatedCostEur
- Avg Latency: Average of latencyMs
- Error Rate: Percentage of logs with statusCode >= 400 or < 200

**Test:**
1. Navigate to `/governance`
2. Apply filters
3. Verify KPIs match filtered data
4. Change date range
5. Verify KPIs update

### 5. Test Logs Table

**Expected:**
- Table columns: Time, Provider, Model, Cost EUR, Tokens, Latency, Status, User, App, Project, Client, Action
- Shows "-" for null values
- Status badges: green (2xx), yellow (4xx), red (5xx)
- "View" link in Action column → navigates to detail page
- Pagination controls at bottom
- Page size selector (25, 50, 100)

**Test:**
1. Navigate to `/governance`
2. Verify table shows logs
3. Click "View" on a log → Should navigate to `/governance/ai-logs/{id}`
4. Click "Next" → Next page loads
5. Change page size to 50 → Table shows 50 logs per page
6. Verify pagination info shows correct counts

### 6. Test Export CSV

**Expected:**
- Click "Export CSV" button
- CSV file downloads with filename: `ai-logs-YYYY-MM-DD.csv`
- CSV contains all logs matching current filters (max 10k rows)
- CSV headers: Time, Provider, Model, Cost (EUR), Input Tokens, Output Tokens, Total Tokens, Latency (ms), Status Code, User ID, Team ID, Project ID, App ID, Client ID, Request ID

**Test:**
1. Navigate to `/governance`
2. Apply some filters (e.g., dateRange=last7, provider=openai)
3. Click "Export CSV"
4. Verify file downloads
5. Open CSV and verify:
   - Headers are correct
   - Data matches filtered logs
   - Dates are in ISO format
   - Costs are formatted correctly

**Validation:**
```bash
# Test export endpoint (requires auth)
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/governance/ai-logs/export?dateRange=last7&provider=openai" \
  -o ai-logs.csv
```

### 7. Test Log Detail Page

**URL:** `/governance/ai-logs/{id}`

**Expected:**
- Shows all log fields: Time, Provider, Model, Status Code, Cost, Latency, Tokens, Prompt Hash
- Shows dimensions: User ID, Team ID, Project ID, App ID, Client ID
- Shows reason if present (from rawRef.reason)
- Shows rawRef (sanitized, no secrets)
- "Back to Governance" link

**Test:**
1. Navigate to `/governance`
2. Click "View" on a log
3. Verify detail page shows all information
4. Verify no secrets are displayed
5. Click "Back to Governance" → Should return to logs list

### 8. Test Retention Tab

**Expected:**
- Shows current retention days setting
- Input field for retention days (1-3650)
- Save button (admin/finance only)
- Helper text: "Logs older than X days are deleted daily"
- Read-only message for non-admin/finance users

**Test:**
1. Navigate to `/governance`
2. Click "Retention" tab
3. Verify current retention days displayed
4. If admin/finance:
   - Change retention days
   - Click "Save"
   - Verify success message
   - Verify setting persisted
5. If user/manager:
   - Verify input is disabled
   - Verify message about permissions

**Validation:**
```bash
# Test retention GET
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/governance/retention"

# Test retention POST (admin/finance only)
curl -X POST -H "Cookie: auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"aiLogRetentionDays": 60}' \
  "https://your-domain.com/api/governance/retention"
```

### 9. Test Cron Job (apply-retention)

**Expected:**
- Cron runs daily at 3:15 AM (15 3 * * *)
- Deletes AiRequestLog entries older than retention period
- Does NOT delete CostEvents
- Logs execution in CronRunLog

**Test:**
```bash
# Test cron endpoint manually (requires CRON_SECRET)
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://your-domain.com/api/cron/apply-retention"
```

**Expected Response:**
```json
{
  "success": true,
  "orgsProcessed": 5,
  "totalDeleted": 1234,
  "results": [
    {
      "orgId": "org-123",
      "orgName": "Acme Corp",
      "retentionDays": 90,
      "deletedCount": 456
    }
  ]
}
```

**Validation:**
1. Check CronRunLog table for entry with cronName='apply-retention'
2. Verify old logs are deleted (check AiRequestLog table)
3. Verify CostEvents are NOT deleted
4. Verify retention period is respected

### 10. Test Bonus Links

#### 10.1 From /admin/ai
**Expected:**
- "View Governance" button in header
- Clicking navigates to `/governance`

**Test:**
1. Navigate to `/admin/ai`
2. Verify "View Governance" button visible
3. Click button
4. Verify navigates to `/governance`

#### 10.2 From /costs
**Expected:**
- In events table, if source='AI' and rawRef.requestId exists, Id column shows as link
- Clicking link navigates to `/governance/ai-logs/{requestId}`

**Test:**
1. Navigate to `/costs`
2. Filter by provider=AI (or find AI events)
3. Verify Id column shows links for AI events with requestId
4. Click link
5. Verify navigates to log detail page

### 11. Test Empty States

**Expected:**
- If no logs: "No logs found" message
- KPIs show 0 if no data
- Page doesn't crash

**Test:**
1. Use an org with no AiRequestLog entries
2. Navigate to `/governance`
3. Verify empty states display correctly
4. Verify no errors in console

### 12. Test Loading States

**Expected:**
- Loading indicator appears when fetching data
- Filters remain interactive during load
- Table shows "Loading..." message

**Test:**
1. Navigate to `/governance`
2. Change filters rapidly
3. Verify loading states appear
4. Verify no duplicate requests

### 13. Test URL Persistence

**Expected:**
- Filters are reflected in URL query parameters
- Refreshing page maintains filters
- Sharing URL with filters works

**Test:**
1. Navigate to `/governance`
2. Apply filters: dateRange=last7, provider=openai, statusCode=2xx
3. Verify URL: `/governance?dateRange=last7&provider=openai&statusCode=2xx&page=1&pageSize=25`
4. Refresh page
5. Verify filters are maintained
6. Copy URL and open in new tab
7. Verify filters are applied

## API Endpoints Validation

### GET /api/governance/ai-logs
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/governance/ai-logs?dateRange=last30&provider=openai"
```

**Expected Response:**
```json
{
  "summary": {
    "totalRequests": 1234,
    "totalCost": 45.67,
    "avgLatency": 234,
    "errorRate": 2.5
  },
  "logs": [
    {
      "id": "log-123",
      "occurredAt": "2024-01-15T10:30:00Z",
      "provider": "openai",
      "model": "gpt-4",
      "estimatedCostEur": 0.0123,
      "inputTokens": 100,
      "outputTokens": 50,
      "totalTokens": 150,
      "latencyMs": 234,
      "statusCode": 200,
      "userId": "user-123",
      "appId": "app-123",
      "projectId": null,
      "clientId": null,
      "rawRef": {
        "requestId": "req-123"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalCount": 1234,
    "totalPages": 50
  }
}
```

### GET /api/governance/ai-logs/export
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/governance/ai-logs/export?dateRange=last30" \
  -o ai-logs.csv
```

**Expected:**
- Content-Type: text/csv
- Content-Disposition: attachment; filename="ai-logs-YYYY-MM-DD.csv"
- CSV content with headers and data (max 10k rows)

### GET /api/governance/retention
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/governance/retention"
```

**Expected Response:**
```json
{
  "aiLogRetentionDays": 90
}
```

### POST /api/governance/retention
```bash
curl -X POST -H "Cookie: auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"aiLogRetentionDays": 60}' \
  "https://your-domain.com/api/governance/retention"
```

**Expected Response:**
```json
{
  "success": true,
  "aiLogRetentionDays": 60
}
```

**Error Response (non-admin/finance):**
```json
{
  "error": "Access denied"
}
```

## Data Test IDs

Verify these test IDs exist in the DOM:
- `data-testid="governance-page"` - Main container
- `data-testid="governance-filters"` - Filters section
- `data-testid="governance-kpis"` - KPI cards
- `data-testid="governance-logs-table"` - Logs table
- `data-testid="governance-log-row-{id}"` - Individual log row
- `data-testid="governance-export"` - Export button
- `data-testid="governance-retention"` - Retention tab

## Performance Checks

1. **Initial Load:** Page should load in < 2 seconds
2. **Filter Changes:** Data should refresh in < 1 second
3. **Export:** CSV generation should complete in < 5 seconds for 10k logs
4. **Pagination:** Page changes should be instant
5. **Cron Job:** Should complete in < 30 seconds for 100 orgs

## Known Limitations

1. Search filter is done in memory after fetching all logs. For large datasets, this may be slow.
2. Export is limited to 10k rows to avoid OOM.
3. Retention cron runs daily, not real-time.

## Success Criteria

✅ All test cases pass
✅ No console errors
✅ RBAC enforced correctly
✅ Export generates valid CSV
✅ Cron job deletes old logs but preserves CostEvents
✅ Retention settings can be updated (admin/finance only)
✅ Bonus links work correctly
✅ URL persistence works
✅ Empty states handled gracefully
✅ Loading states appear

