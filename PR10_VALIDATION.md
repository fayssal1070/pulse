# PR10 Validation - Directory Dimensions + Attribution

## Overview
This document describes how to validate the Directory Dimensions and Attribution implementation.

## Prerequisites
- User must be authenticated
- User must have an active organization
- User must have admin/finance/manager role to create directory entities

## Test Cases

### 1. Access Directory Page
**URL:** `/directory`

**Expected:**
- Page loads without errors
- Header shows "Directory" title
- Four tabs: Teams, Projects, Apps, Clients
- "New" button visible (admin/finance/manager only)
- Empty state if no entities exist

**Validation:**
```bash
# Check page loads
curl -I https://your-domain.com/directory
```

### 2. Test RBAC for Directory

#### 2.1 Admin/Finance/Manager
**Expected:**
- Can create, update, delete directory entities
- Can see all entities

**Test:**
1. Login as admin/finance/manager
2. Navigate to `/directory`
3. Verify "New" button visible
4. Verify can create/edit/delete entities

#### 2.2 User Role
**Expected:**
- Cannot create, update, or delete entities
- Can view entities (read-only)
- "New" button not visible

**Test:**
1. Login as regular user
2. Navigate to `/directory`
3. Verify "New" button NOT visible
4. Verify cannot create/edit/delete (API returns 403)

**Validation:**
```bash
# Test API with user role (should fail)
curl -X POST -H "Cookie: user-auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Team"}' \
  "https://your-domain.com/api/directory/teams"
# Expected: 403 Forbidden
```

### 3. Create Directory Entities

#### 3.1 Create Team
1. Navigate to `/directory`
2. Click "Teams" tab
3. Click "+ New Team"
4. Fill: Name="Engineering"
5. Submit
6. Verify team appears in list

#### 3.2 Create Project
1. Click "Projects" tab
2. Click "+ New Project"
3. Fill: Name="Web App"
4. Submit
5. Verify project appears in list

#### 3.3 Create App
1. Click "Apps" tab
2. Click "+ New App"
3. Fill: Name="Customer Portal", Slug="customer-portal" (optional)
4. Submit
5. Verify app appears in list
6. Verify slug is unique per org

#### 3.4 Create Client
1. Click "Clients" tab
2. Click "+ New Client"
3. Fill: Name="Acme Corp", External ID="ACME-001" (optional)
4. Submit
5. Verify client appears in list

### 4. Test AI Gateway Attribution

#### 4.1 Request with appId
```bash
curl -X POST \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -H "x-pulse-app: ${APP_ID}" \
  -d '{
    "model": "gpt-4",
    "prompt": "Hello world"
  }' \
  "https://your-domain.com/api/ai/request"
```

**Expected:**
- Request succeeds
- AiRequestLog contains appId
- CostEvent contains appId in both dimensions JSON and appId column
- teamId derived from membership if not provided

#### 4.2 Request with invalid appId
```bash
curl -X POST \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "x-pulse-app: invalid-app-id" \
  -d '{"model": "gpt-4", "prompt": "Hello"}' \
  "https://your-domain.com/api/ai/request"
```

**Expected:**
- Returns 400 "Invalid appId"

#### 4.3 Request with requireAttribution policy
1. Create AiPolicy with requireAttribution=true
2. Make request without appId
3. Expected: Returns 400 "appId required by policy"

### 5. Test Dimension Validation

**Test:**
1. Create Team, Project, App, Client
2. Make AI request with all dimensions:
   ```json
   {
     "model": "gpt-4",
     "prompt": "Test",
     "appId": "${APP_ID}",
     "projectId": "${PROJECT_ID}",
     "clientId": "${CLIENT_ID}"
   }
   ```
3. Verify:
   - AiRequestLog contains all IDs
   - CostEvent contains all IDs in columns and dimensions JSON
   - teamId derived from membership

### 6. Test Costs Page with Dimensions

**Expected:**
- Filters show dropdowns for Team/Project/App/Client (if entities exist)
- Events table shows dimension names (not just IDs)
- Export CSV includes dimension names

**Test:**
1. Navigate to `/costs`
2. Verify filters show dropdowns
3. Select filter (e.g., App)
4. Verify events filtered correctly
5. Verify dimension names displayed in table
6. Export CSV and verify dimension names included

### 7. Test AWS CUR Attribution (Future)

**Expected:**
- If AWS tags contain project/app/client, map to directory entities
- CostEvent contains dimension IDs

**Test:**
1. Ensure AWS CUR has tags: `project=web-app`, `app=customer-portal`
2. Run CUR sync
3. Verify CostEvents have projectId/appId set

### 8. Test Onboarding Warnings

**Expected:**
- If no Teams/Projects/Apps/Clients exist, show warning on /dashboard and /costs
- Link to /directory

**Test:**
1. Use org with no directory entities
2. Navigate to `/dashboard`
3. Verify warning displayed
4. Navigate to `/costs`
5. Verify warning displayed

## API Endpoints Validation

### GET /api/directory/teams
```bash
curl -H "Cookie: auth-cookie" \
  "https://your-domain.com/api/directory/teams"
```

**Expected Response:**
```json
{
  "teams": [
    {
      "id": "team-123",
      "name": "Engineering",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /api/directory/teams
```bash
curl -X POST -H "Cookie: auth-cookie" \
  -H "Content-Type: application/json" \
  -d '{"name": "Engineering"}' \
  "https://your-domain.com/api/directory/teams"
```

**Expected Response:**
```json
{
  "team": {
    "id": "team-123",
    "name": "Engineering",
    "orgId": "org-123",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Similar endpoints for projects, apps, clients

## Success Criteria

✅ All test cases pass
✅ No console errors
✅ RBAC enforced correctly
✅ AI Gateway validates dimensions
✅ CostEvent and AiRequestLog contain dimension IDs
✅ Costs page shows dimension names
✅ Onboarding warnings displayed
✅ TypeScript build passes

