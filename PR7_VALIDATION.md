# PR7 Validation Checklist

## Setup & Configuration

1. **Setup Checklist on Dashboard**
   - Navigate to `/dashboard`
   - Verify "Setup Status" panel appears at the top
   - Check that incomplete items show action links
   - Verify completed items show ✓

2. **Health Endpoint**
   - `GET /api/health/setup` (authenticated)
   - Should return JSON with status for: awsCur, aiGateway, budgets, notifications, cron

## AI Gateway Dimensions

3. **Test AI Request with Headers**
   ```bash
   curl -X POST https://your-domain.com/api/ai/request \
     -H "Content-Type: application/json" \
     -H "x-pulse-team: team-123" \
     -H "x-pulse-project: project-456" \
     -H "x-pulse-app: app-789" \
     -H "Cookie: next-auth.session-token=..." \
     -d '{
       "model": "gpt-4o-mini",
       "prompt": "Hello"
     }'
   ```
   - Verify request succeeds
   - Check `/logs/ai` - log should show team/project/app IDs

4. **Test AI Request with Body Dimensions**
   ```bash
   curl -X POST https://your-domain.com/api/ai/request \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=..." \
     -d '{
       "model": "gpt-4o-mini",
       "prompt": "Hello",
       "teamId": "team-123",
       "projectId": "project-456",
       "appId": "app-789",
       "clientId": "client-abc"
     }'
   ```
   - Verify request succeeds
   - Check `/logs/ai` - log should show all dimensions

5. **Simulation Mode (Dev Only)**
   - Set `PULSE_SIMULATE_AI=true` in env
   - Make AI request
   - Verify response contains "[SIMULATED]" prefix
   - Verify CostEvent and AiRequestLog are still created

## AI Logs Page

6. **Access AI Logs**
   - Navigate to `/logs/ai`
   - Verify table displays recent AI requests
   - Check columns: Time, Model, Tokens, Cost, Latency, Status

7. **Filter AI Logs**
   - Set date range filter
   - Set model filter (e.g., "gpt-4o-mini")
   - Set status filter (success/error/blocked)
   - Verify results update correctly

8. **Export AI Logs**
   - Click "Export CSV" button
   - Verify CSV downloads with correct filename
   - Verify CSV contains expected columns

9. **RBAC on AI Logs**
   - Login as regular user (role: user)
   - Navigate to `/logs/ai`
   - Verify only own logs are visible
   - Login as admin/finance/manager
   - Verify all org logs are visible

## Costs Page

10. **Access Costs**
    - Navigate to `/costs`
    - Verify table displays CostEvents (AWS + AI)
    - Check columns: Date, Source, Provider, Service, Amount

11. **Filter Costs**
    - Set source filter (AWS/AI)
    - Set date range
    - Set provider filter
    - Verify results update correctly

12. **Group By Costs**
    - Select "Group By: Day"
    - Verify results are aggregated by day
    - Select "Group By: Source"
    - Verify results are aggregated by source
    - Select "Group By: Provider"
    - Verify results are aggregated by provider

13. **Export Costs**
    - Click "Export CSV" button
    - Verify CSV downloads with correct filename
    - Verify CSV contains expected columns

14. **RBAC on Costs**
    - Login as regular user (role: user)
    - Navigate to `/costs`
    - Verify only own costs are visible (filtered by userId in dimensions)
    - Login as admin/finance/manager
    - Verify all org costs are visible

## Navigation

15. **Sidebar Navigation**
    - Verify sidebar contains:
      - Dashboard
      - Costs
      - AI Logs
      - Cloud Accounts
      - Budgets
      - Alerts
      - Notifications
      - Team
      - Settings
    - Click each link and verify navigation works

## Budget Enforcement

16. **Budget Block Test**
    - Create a budget with `hardLimit: true`, `action: { block: true }`
    - Set budget to CRITICAL status (exceeded)
    - Make AI request
    - Verify request is blocked with 403
    - Check `/logs/ai` - should show blocked request with status 403

## Integration

17. **End-to-End Test**
    - Make AI request via `/api/ai/request`
    - Verify:
      - Request appears in `/logs/ai`
      - CostEvent appears in `/costs`
      - Dashboard KPIs update (if within date range)
      - Export CSV includes the new request

## Edge Cases

18. **Empty State**
    - Navigate to `/logs/ai` with no data
    - Verify "No logs found" message
    - Navigate to `/costs` with no data
    - Verify "No costs found" message

19. **Large Dataset**
    - Test pagination on `/logs/ai` (if >20 logs)
    - Test pagination on `/costs` (if >50 events)
    - Verify "Previous" and "Next" buttons work

20. **Invalid Filters**
    - Set invalid date range (end < start)
    - Verify graceful handling (no crash)
    - Set invalid model name
    - Verify results are empty (not error)
