# PR7 Validation - Costs Page

## Overview
This document describes how to validate the costs page implementation with filters, breakdowns, events table, and export functionality.

## Prerequisites
- User must be authenticated
- User must have an active organization
- CostEvents should exist in the database (AWS or AI)

## Test Cases

### 1. Access the Costs Page
**URL:** `/costs`

**Expected:**
- Page loads without errors
- Header shows "Costs" title and "Track and analyze AWS and AI costs" subtitle
- Export CSV button is visible in the header
- Filters section is visible with:
  - Date Range dropdown (Last 7 days, Last 30 days, Month to Date, Last Month, Custom)
  - Provider dropdown (All Providers, AWS, OpenAI, Anthropic, Google)
  - Search input
  - Dimension tabs (Users, Teams, Projects, Apps, Clients, Models)
- KPI cards show: AI Cost, AWS Cost, Total Cost, MoM Delta, Today
- Breakdown panel shows top 10 items for selected dimension
- Events table shows paginated cost events

**Validation:**
```bash
# Check page loads
curl -I https://your-domain.com/costs
```

### 2. Test Filters

#### 2.1 Date Range Filter
- Select "Last 7 days" → Events should filter to last 7 days
- Select "Month to Date" → Events should filter to current month
- Select "Custom" → Start Date and End Date inputs appear
- Set custom dates → Events should filter to date range

#### 2.2 Provider Filter
- Select "AWS" → Only AWS events shown
- Select "OpenAI" → Only OpenAI events shown
- Select "All Providers" → All events shown

#### 2.3 Search Filter
- Type "gpt" in search → Events filtered by model/provider/service containing "gpt"
- Type "EC2" → Events filtered by service containing "EC2"

#### 2.4 Dimension Tabs
- Click "Users" tab → Breakdown shows top users
- Click "Teams" tab → Breakdown shows top teams
- Click "Models" tab → Breakdown shows top models

**Validation:**
- URL should update with query parameters
- Data should refresh when filters change
- Loading states should appear during fetch

### 3. Test Breakdown Panel

**Expected:**
- Shows top 10 items for selected dimension
- Each item shows:
  - Name (or "Unknown" if empty)
  - Amount in EUR
  - Percentage of total
  - Event count

**Test:**
1. Navigate to `/costs`
2. Click different dimension tabs
3. Verify breakdown updates
4. Verify percentages sum to ~100% (may be less if top 10 doesn't cover all)

### 4. Test Events Table

**Expected:**
- Table columns: Date, Provider, Model, Amount EUR, User, Team, Project, App, Client, Source, Id
- Shows "-" for null values
- Pagination controls at bottom
- Page size selector (25, 50, 100)

**Test:**
1. Navigate to `/costs`
2. Verify table shows events
3. Click "Next" → Next page loads
4. Change page size to 50 → Table shows 50 events per page
5. Verify pagination info shows correct counts

### 5. Test Export CSV

**Expected:**
- Click "Export CSV" button
- CSV file downloads with filename: `cost-events-YYYY-MM-DD.csv`
- CSV contains all events matching current filters
- CSV headers: Date, Source, Provider, Service, Model, Amount (EUR), Amount (USD), Currency, User ID, Team ID, Project ID, App ID, Client ID, Event ID

**Test:**
1. Navigate to `/costs`
2. Apply some filters (e.g., dateRange=last7, provider=aws)
3. Click "Export CSV"
4. Verify file downloads
5. Open CSV and verify:
   - Headers are correct
   - Data matches filtered events
   - Dates are in ISO format
   - Amounts are formatted correctly

**Validation:**
```bash
# Test export endpoint (requires auth)
curl -H "Cookie: your-auth-cookie" \
  "https://your-domain.com/api/costs/export?dateRange=last7&provider=aws" \
  -o cost-events.csv
```

### 6. Test Drilldown from Dashboard

**Expected:**
- Click a row in "Top 5 Consumers" on dashboard
- Navigate to `/costs` with pre-filled filters:
  - `dimension` set to the clicked dimension (users/teams/projects/apps/clients)
  - `userId`/`teamId`/`projectId`/`appId`/`clientId` set to the clicked item's ID
  - `range=mtd`
  - `provider=ALL`

**Test:**
1. Navigate to `/dashboard`
2. In "Top 5 Consumers" section, click on a user row
3. Verify redirect to `/costs?dimension=users&userId=...&range=mtd&provider=ALL`
4. Verify events table shows only events for that user
5. Verify breakdown shows that user at the top

### 7. Test RBAC (Role-Based Access Control)

#### 7.1 Admin/Finance/Manager
**Expected:**
- Can see all cost events
- Can see all users/teams/projects in breakdown
- Can export all events

**Test:**
1. Login as admin/finance/manager
2. Navigate to `/costs`
3. Verify all events visible
4. Verify breakdown shows all users/teams

#### 7.2 User Role
**Expected:**
- Can only see their own cost events (filtered by userId in dimensions)
- Breakdown only shows their own data
- Export only includes their events

**Test:**
1. Login as regular user
2. Navigate to `/costs`
3. Verify only events with `dimensions.userId === currentUserId` are shown
4. Verify breakdown only shows the user themselves
5. Export CSV and verify only user's events included

**Validation:**
```bash
# Test API with user role
# Should only return events where dimensions.userId === user.id
curl -H "Cookie: user-auth-cookie" \
  "https://your-domain.com/api/costs/events?dateRange=last30"
```

### 8. Test Empty States

**Expected:**
- If no events: "No cost events found" message
- If no breakdown data: "No data" message
- KPIs show 0.00 € if no data
- Page doesn't crash

**Test:**
1. Use an org with no CostEvents
2. Navigate to `/costs`
3. Verify empty states display correctly
4. Verify no errors in console

### 9. Test Loading States

**Expected:**
- Loading indicator appears when fetching data
- Filters remain interactive during load
- Table shows "Loading..." message

**Test:**
1. Navigate to `/costs`
2. Change filters rapidly
3. Verify loading states appear
4. Verify no duplicate requests

### 10. Test URL Persistence

**Expected:**
- Filters are reflected in URL query parameters
- Refreshing page maintains filters
- Sharing URL with filters works

**Test:**
1. Navigate to `/costs`
2. Apply filters: dateRange=last7, provider=aws, dimension=users
3. Verify URL: `/costs?dateRange=last7&provider=aws&dimension=users&page=1&pageSize=25`
4. Refresh page
5. Verify filters are maintained
6. Copy URL and open in new tab
7. Verify filters are applied

## API Endpoints Validation

### GET /api/costs/summary
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/costs/summary?dateRange=last30&provider=ALL"
```

**Expected Response:**
```json
{
  "aiCost": 123.45,
  "awsCost": 678.90,
  "totalCost": 802.35,
  "momDelta": 50.25,
  "momDeltaPercent": 6.7,
  "todayCost": 12.34
}
```

### GET /api/costs/breakdown
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/costs/breakdown?dimension=users&limit=10&dateRange=last30"
```

**Expected Response:**
```json
{
  "breakdown": [
    {
      "id": "user-123",
      "name": "user-123",
      "amountEur": 100.50,
      "percentage": 12.5,
      "eventCount": 45
    }
  ]
}
```

### GET /api/costs/events
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/costs/events?page=1&pageSize=25&dateRange=last30"
```

**Expected Response:**
```json
{
  "events": [
    {
      "id": "event-123",
      "occurredAt": "2024-01-15T10:30:00Z",
      "source": "AI",
      "provider": "openai",
      "model": "gpt-4",
      "amountEur": 0.1234,
      "userId": "user-123",
      "teamId": null,
      "projectId": null,
      "appId": null,
      "clientId": null,
      "service": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalCount": 100,
    "totalPages": 4
  }
}
```

### GET /api/costs/export
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/costs/export?dateRange=last30" \
  -o cost-events.csv
```

**Expected:**
- Content-Type: text/csv
- Content-Disposition: attachment; filename="cost-events-YYYY-MM-DD.csv"
- CSV content with headers and data

## Data Test IDs

Verify these test IDs exist in the DOM:
- `data-testid="costs-page"` - Main container
- `data-testid="costs-filters"` - Filters section
- `data-testid="costs-kpis"` - KPI cards
- `data-testid="costs-breakdown"` - Breakdown panel
- `data-testid="costs-events-table"` - Events table
- `data-testid="costs-export"` - Export button

## Performance Checks

1. **Initial Load:** Page should load in < 2 seconds
2. **Filter Changes:** Data should refresh in < 1 second
3. **Export:** CSV generation should complete in < 5 seconds for 10k events
4. **Pagination:** Page changes should be instant

## Known Limitations

1. Dimension filtering (userId, teamId, etc.) is done in memory after fetching all events. For large datasets, this may be slow.
2. Search is case-insensitive but simple string matching.
3. Model filtering requires checking dimensions JSON field.

## Success Criteria

✅ All test cases pass
✅ No console errors
✅ RBAC enforced correctly
✅ Export generates valid CSV
✅ Drilldown from dashboard works
✅ URL persistence works
✅ Empty states handled gracefully
✅ Loading states appear
