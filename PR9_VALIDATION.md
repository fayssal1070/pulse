# PR9 Validation - Alert Rules V2 + Events + Cron Integration

## Overview
This document describes how to validate the Alert Rules V2 implementation with configurable rules, event history, and cron integration.

## Prerequisites
- User must be authenticated
- User must have an active organization
- CostEvents should exist in the database (for rule computation)
- CRON_SECRET environment variable must be set

## Test Cases

### 1. Access the Alerts Page
**URL:** `/alerts`

**Expected:**
- Page loads without errors
- Header shows "Alerts" title and subtitle
- Two tabs: "Rules" and "Events"
- "New Rule" button visible (admin/finance/manager only)
- Rules tab shows list of alert rules with toggle/enable buttons
- Events tab shows paginated alert events

**Validation:**
```bash
# Check page loads
curl -I https://your-domain.com/alerts
```

### 2. Test RBAC (Role-Based Access Control)

#### 2.1 Admin/Finance/Manager
**Expected:**
- Can create, update, delete alert rules
- Can toggle rules enabled/disabled
- Can view all alert events
- Can see all rules

**Test:**
1. Login as admin/finance/manager
2. Navigate to `/alerts`
3. Verify "New Rule" button visible
4. Verify can create/edit/delete rules
5. Verify can toggle rules
6. Verify can see all events

#### 2.2 User Role
**Expected:**
- Cannot create, update, or delete rules
- Can view rules (read-only)
- Can view events (read-only, filtered if user scope)
- "New Rule" button not visible

**Test:**
1. Login as regular user
2. Navigate to `/alerts`
3. Verify "New Rule" button NOT visible
4. Verify cannot access `/alerts/new` (redirects)
5. Verify can view rules and events (read-only)

**Validation:**
```bash
# Test API with user role (should fail)
curl -X POST -H "Cookie: user-auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"DAILY_SPIKE","spikePercent":50}' \
  "https://your-domain.com/api/alerts/rules"
# Expected: 403 Forbidden
```

### 3. Test Create Alert Rule

**URL:** `/alerts/new`

**Expected:**
- Form with fields: name, type, type-specific fields, provider filter, cooldown
- Type-specific fields appear conditionally
- Validation on required fields
- Success redirects to `/alerts`

**Test Cases:**

#### 3.1 DAILY_SPIKE Rule
1. Navigate to `/alerts/new`
2. Fill:
   - Name: "Daily Cost Spike Alert"
   - Type: "Daily Spike"
   - Spike Percent: 50
   - Lookback Days: 7
   - Provider Filter: "AWS"
   - Cooldown Hours: 24
3. Submit
4. Verify rule created
5. Verify appears in rules list

#### 3.2 TOP_CONSUMER_SHARE Rule
1. Navigate to `/alerts/new`
2. Fill:
   - Name: "Top Consumer Alert"
   - Type: "Top Consumer Share"
   - Top Share Percent: 30
   - Provider Filter: "TOTAL"
3. Submit
4. Verify rule created

#### 3.3 CUR_STALE Rule
1. Navigate to `/alerts/new`
2. Fill:
   - Name: "CUR Sync Stale"
   - Type: "CUR Stale"
3. Submit
4. Verify rule created

#### 3.4 NO_BUDGETS Rule
1. Navigate to `/alerts/new`
2. Fill:
   - Name: "No Budgets Warning"
   - Type: "No Budgets"
3. Submit
4. Verify rule created

#### 3.5 BUDGET_STATUS Rule
1. Navigate to `/alerts/new`
2. Fill:
   - Name: "Budget Status Alert"
   - Type: "Budget Status"
3. Submit
4. Verify rule created

**Validation:**
- All required fields validated
- Type-specific fields shown/hidden correctly
- Form submission works
- RBAC enforced (user cannot create)

### 4. Test Rule Management

#### 4.1 Toggle Enabled/Disabled
**Expected:**
- Click "Enable" or "Disable" button
- Rule enabled state toggles
- UI updates immediately
- Disabled rules are not evaluated by cron

**Test:**
1. Navigate to `/alerts`
2. Find a rule
3. Click "Disable"
4. Verify rule shows "DISABLED" badge
5. Click "Enable"
6. Verify rule shows "ENABLED" badge

#### 4.2 Edit Rule
**Expected:**
- Click "Edit" button
- Navigate to edit page (if exists) or inline edit
- Can modify rule fields
- Changes persist

**Test:**
1. Navigate to `/alerts`
2. Click "Edit" on a rule
3. Modify fields
4. Save
5. Verify changes reflected

#### 4.3 Delete Rule
**Expected:**
- Click "Delete" button
- Confirmation dialog appears
- Rule deleted
- Associated events remain (or cascade delete)

**Test:**
1. Navigate to `/alerts`
2. Click "Delete" on a rule
3. Confirm deletion
4. Verify rule removed from list

### 5. Test Events Tab

**Expected:**
- Table shows: Time, Rule, Type, Severity, Amount, Message
- Filters: Date Range, Severity, Type, Search
- Pagination controls
- Events sorted by triggeredAt desc

**Test:**
1. Navigate to `/alerts`
2. Click "Events" tab
3. Verify events table displays
4. Apply filters:
   - Date Range: "Last 7 days"
   - Severity: "WARN"
   - Type: "DAILY_SPIKE"
   - Search: "spike"
5. Verify filtered results
6. Test pagination

**Validation:**
- URL updates with query parameters
- Filters work correctly
- Pagination works
- Empty states handled

### 6. Test Rule Computation (Manual)

**Expected:**
- Rules engine computes matches correctly
- Events created when conditions met
- Cooldown prevents spam

**Test DAILY_SPIKE:**
1. Create DAILY_SPIKE rule with spikePercent=50, lookbackDays=7
2. Ensure data exists:
   - Baseline: 7 days of costs averaging €100/day
   - Last 24h: €200 (100% spike)
3. Trigger cron or manually call rules engine
4. Verify AlertEvent created with severity WARN/CRITICAL
5. Verify message contains spike details

**Test TOP_CONSUMER_SHARE:**
1. Create TOP_CONSUMER_SHARE rule with topSharePercent=30
2. Ensure data exists:
   - MTD costs: €1000 total
   - Top user: €400 (40% share)
3. Trigger cron
4. Verify AlertEvent created
5. Verify message contains top consumer details

**Test CUR_STALE:**
1. Create CUR_STALE rule
2. Ensure org has awsCurEnabled=true
3. Set last batch > 48h ago (or no batch)
4. Trigger cron
5. Verify AlertEvent created with severity WARN

**Test NO_BUDGETS:**
1. Create NO_BUDGETS rule
2. Ensure org has no budgets
3. Trigger cron
4. Verify AlertEvent created with severity INFO

**Test BUDGET_STATUS:**
1. Create BUDGET_STATUS rule
2. Ensure budgets exist with exceeded thresholds
3. Trigger cron
4. Verify AlertEvents created for each exceeded budget

### 7. Test Cooldown

**Expected:**
- Rule with cooldownHours=24 won't trigger again within 24h
- lastTriggeredAt updated after trigger
- Cooldown respected in shouldCreateEvent

**Test:**
1. Create rule with cooldownHours=1
2. Trigger cron → event created
3. Immediately trigger cron again → no event (cooldown active)
4. Wait 1+ hour
5. Trigger cron → event created again

**Validation:**
- Cooldown prevents duplicate events
- lastTriggeredAt updated correctly
- Events not created during cooldown

### 8. Test Cron Integration

**Expected:**
- Cron runs every 2 hours
- Computes all enabled rules
- Creates AlertEvents
- Sends notifications (email/telegram/in-app)
- Logs execution in CronRunLog

**Test:**
```bash
# Test cron endpoint manually (requires CRON_SECRET)
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://your-domain.com/api/cron/run-alerts"
```

**Expected Response:**
```json
{
  "message": "Alerts dispatch completed for 5 organizations",
  "processedOrgs": 5,
  "triggered": 3,
  "sentEmail": 6,
  "sentTelegram": 2,
  "sentInApp": 3,
  "errorsCount": 0,
  "errors": []
}
```

**Validation:**
1. Check CronRunLog table for entry with cronName='run-alerts'
2. Verify AlertEvents created
3. Verify InAppNotifications created
4. Verify emails sent (if enabled)
5. Verify Telegram messages sent (if enabled)
6. Verify cooldown respected

### 9. Test Notification Dispatch

**Expected:**
- AlertEvents trigger notifications
- Respects user notification preferences
- Email, Telegram, In-App notifications sent
- Uses same dispatch pipeline as budget alerts (PR6)

**Test:**
1. Create rule
2. Ensure rule matches (trigger event)
3. Verify:
   - InAppNotification created (org-wide)
   - Email sent (if user prefs enabled)
   - Telegram sent (if user prefs enabled and bot configured)

**Validation:**
- Notifications respect user preferences
- Multiple channels work
- No duplicate notifications

### 10. Test Empty States

**Expected:**
- If no rules: "No alert rules configured" message
- If no events: "No events found" message
- Page doesn't crash

**Test:**
1. Use an org with no AlertRules
2. Navigate to `/alerts`
3. Verify empty state in Rules tab
4. Click Events tab
5. Verify empty state in Events tab

### 11. Test Data Test IDs

Verify these test IDs exist in the DOM:
- `data-testid="alerts-page"` - Main container
- `data-testid="alerts-tab-rules"` - Rules tab
- `data-testid="alerts-tab-events"` - Events tab
- `data-testid="alerts-new-rule"` - New Rule button
- `data-testid="alerts-rules"` - Rules list
- `data-testid="alerts-rule-{id}"` - Individual rule
- `data-testid="alerts-rule-toggle-{id}"` - Toggle button
- `data-testid="alerts-events"` - Events container
- `data-testid="alerts-events-table"` - Events table
- `data-testid="alerts-event-{id}"` - Individual event
- `data-testid="alerts-new-rule-form"` - New rule form
- `data-testid="alerts-rule-name"` - Name input
- `data-testid="alerts-rule-type"` - Type select
- `data-testid="alerts-rule-submit"` - Submit button

## API Endpoints Validation

### GET /api/alerts/rules
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/alerts/rules"
```

**Expected Response:**
```json
{
  "rules": [
    {
      "id": "rule-123",
      "name": "Daily Spike Alert",
      "type": "DAILY_SPIKE",
      "enabled": true,
      "spikePercent": 50,
      "lookbackDays": 7,
      "providerFilter": "AWS",
      "cooldownHours": 24,
      "lastTriggeredAt": "2024-01-15T10:30:00Z",
      "_count": {
        "alertEvents": 5
      }
    }
  ]
}
```

### POST /api/alerts/rules
```bash
curl -X POST -H "Cookie: auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Spike",
    "type": "DAILY_SPIKE",
    "spikePercent": 50,
    "lookbackDays": 7,
    "cooldownHours": 24
  }' \
  "https://your-domain.com/api/alerts/rules"
```

**Expected Response:**
```json
{
  "rule": {
    "id": "rule-123",
    "name": "Daily Spike",
    "type": "DAILY_SPIKE",
    "enabled": true,
    ...
  }
}
```

**Error Response (non-admin/finance/manager):**
```json
{
  "error": "Access denied"
}
```

### PATCH /api/alerts/rules/{id}
```bash
curl -X PATCH -H "Cookie: auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}' \
  "https://your-domain.com/api/alerts/rules/rule-123"
```

### DELETE /api/alerts/rules/{id}
```bash
curl -X DELETE -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/alerts/rules/rule-123"
```

### GET /api/alerts/events
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/alerts/events?dateRange=last30&severity=WARN&type=DAILY_SPIKE&page=1&pageSize=25"
```

**Expected Response:**
```json
{
  "events": [
    {
      "id": "event-123",
      "triggeredAt": "2024-01-15T10:30:00Z",
      "severity": "WARN",
      "amountEUR": 150.50,
      "message": "Daily cost spike: €200.00 (+100% vs 7-day avg €100.00)",
      "periodStart": "2024-01-14T10:30:00Z",
      "periodEnd": "2024-01-15T10:30:00Z",
      "metadata": {
        "baselineAvg": 100,
        "last24hTotal": 200,
        "spikePercent": 100
      },
      "alertRule": {
        "id": "rule-123",
        "name": "Daily Spike Alert",
        "type": "DAILY_SPIKE"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalCount": 10,
    "totalPages": 1
  }
}
```

## Performance Checks

1. **Initial Load:** Page should load in < 2 seconds
2. **Rule Creation:** Should complete in < 1 second
3. **Cron Execution:** Should complete in < 30 seconds for 100 orgs
4. **Event Query:** Should complete in < 1 second with pagination

## Known Limitations

1. Rule computation is done per-org sequentially (could be parallelized)
2. Cooldown check is per-rule, not per-event-type
3. User scope filtering for events is simplified (all events visible)

## Success Criteria

✅ All test cases pass
✅ No console errors
✅ RBAC enforced correctly
✅ Rules engine computes correctly
✅ Cooldown prevents spam
✅ Cron integration works
✅ Notifications dispatched correctly
✅ Empty states handled gracefully
✅ Data test IDs present
✅ TypeScript build passes
