# Onboarding Flow - Summary

## Overview

A 3-step onboarding flow guides new users through setup and ensures they reach a populated dashboard quickly.

## Steps

### Step 1: Create Organization
- **Component**: `components/onboarding-step1.tsx`
- **Action**: User selects existing organization or creates a new one
- **Completion**: Organization exists and is set as active
- **Redirect**: If no org exists, redirects to `/organizations/new?onboarding=true`

### Step 2: Connect Cloud Account
- **Component**: `components/onboarding-step2.tsx`
- **Actions**:
  - **Option A**: Manual form to add cloud account (provider + account name)
  - **Option B**: Import CSV file (redirects to `/import?onboarding=true`)
- **Completion**: Cloud account created OR cost records imported via CSV
- **API**: `POST /api/cloud-accounts` creates the account

### Step 3: Set Budget & Alerts
- **Component**: `components/onboarding-step3.tsx`
- **Actions**:
  - Set monthly budget (optional)
  - Create alert threshold (optional)
- **Completion**: At least one of budget or alert is configured
- **APIs**:
  - `POST /api/organizations/{id}/budget` - Sets monthly budget
  - `POST /api/alerts` - Creates alert rule
  - `POST /api/organizations/{id}/onboarding/complete` - Marks onboarding complete

## Database Changes

**No schema changes required** - Uses existing fields:
- `Organization.onboardingCompletedAt` - DateTime? (already exists)
- `Organization.budgetMonthlyEUR` - Float? (already exists)
- `CloudAccount` model (already exists)
- `AlertRule` model (already exists)

## Logic Updates

### `lib/onboarding.ts` - `getOnboardingStatus()`

**Updated logic**:
- **Step 1**: Organization exists (always true if orgId provided)
- **Step 2**: Has cloud account OR has cost records (CSV imported)
- **Step 3**: Has budget OR has alert rule (at least one configured)
- **Completed**: All steps done OR `onboardingCompletedAt` is set

**Previous logic** (incorrect):
- Step 2 checked only for cost records
- Step 3 checked only for `onboardingCompletedAt`

## Files Modified

1. ✅ `components/onboarding-step2.tsx`
   - Now actually creates cloud account via API
   - Form submits to `/api/cloud-accounts`

2. ✅ `components/onboarding-step3.tsx`
   - Added form for budget and alert threshold
   - Creates budget and alert before marking complete
   - Both fields are optional

3. ✅ `lib/onboarding.ts`
   - Updated `getOnboardingStatus()` to check:
     - Cloud accounts (for step 2)
     - Budget OR alert rules (for step 3)

4. ✅ `app/dashboard/page.tsx`
   - Redirects to `/onboarding` if no active org
   - Redirects to `/onboarding` if onboarding not completed
   - Displays `SetupCompleteBanner` when onboarding is complete

5. ✅ `components/setup-complete-banner.tsx`
   - **NEW FILE** - Green banner showing "Setup Complete!"
   - Dismissible (client-side state)

## User Flow

### New User (Fresh Account)

1. **Register** → `/register`
   - Creates account
   - Redirects to `/dashboard`

2. **Dashboard** → Checks onboarding
   - No active org → Redirects to `/onboarding`

3. **Onboarding Step 1** → Create/Select Organization
   - Creates organization
   - Sets as active
   - Proceeds to Step 2

4. **Onboarding Step 2** → Connect Cloud Account
   - Option A: Manual form (provider + name)
   - Option B: CSV import
   - Proceeds to Step 3

5. **Onboarding Step 3** → Set Budget & Alerts
   - Optional: Set monthly budget
   - Optional: Set alert threshold
   - Clicks "Complete Setup"
   - Redirects to `/dashboard`

6. **Dashboard** → Shows "Setup Complete" banner
   - User sees populated dashboard
   - Banner is dismissible

### Returning User (Existing Account)

1. **Login** → `/login`
   - Authenticates
   - Redirects to `/dashboard`

2. **Dashboard** → Checks onboarding
   - If `onboardingCompletedAt` is set → Shows dashboard (skips onboarding)
   - If not completed → Redirects to `/onboarding` to continue

## Test Path: Fresh Account to Dashboard

### Prerequisites
- Fresh database (no users)
- Server running: `npm run dev`

### Steps

1. **Register New Account**
   ```
   URL: http://localhost:3000/register
   Email: test@example.com
   Password: password123
   ```
   - ✅ Account created
   - ✅ Redirects to `/dashboard`

2. **Dashboard Redirects to Onboarding**
   - ✅ No active org → Redirects to `/onboarding`

3. **Step 1: Create Organization**
   ```
   URL: http://localhost:3000/onboarding
   Action: Click "Create Your First Organization"
   Name: Test Organization
   ```
   - ✅ Organization created
   - ✅ Set as active
   - ✅ Proceeds to Step 2

4. **Step 2: Add Cloud Account**
   ```
   Provider: AWS
   Account Name: Production Account
   Click: "Add Account"
   ```
   - ✅ Cloud account created
   - ✅ Proceeds to Step 3

5. **Step 3: Set Budget & Alert**
   ```
   Monthly Budget: 1000 (optional)
   Alert Threshold: 500 (optional)
   Click: "Complete Setup & Go to Dashboard"
   ```
   - ✅ Budget created (if provided)
   - ✅ Alert created (if provided)
   - ✅ Onboarding marked complete
   - ✅ Redirects to `/dashboard`

6. **Dashboard Shows Setup Complete**
   - ✅ Green banner: "Setup Complete!"
   - ✅ Dashboard displays data
   - ✅ Banner is dismissible

### Alternative: CSV Import in Step 2

Instead of manual form:
1. Click "Import CSV" in Step 2
2. Redirects to `/import?onboarding=true`
3. Upload CSV file
4. Returns to Step 3
5. Complete setup

## Verification

### Check Onboarding Status

```sql
-- Check organization onboarding status
SELECT 
  id, 
  name, 
  onboardingCompletedAt,
  budgetMonthlyEUR
FROM "Organization";

-- Check cloud accounts
SELECT id, provider, accountName, status
FROM "CloudAccount";

-- Check alert rules
SELECT id, thresholdEUR, windowDays
FROM "AlertRule";
```

### Verify Steps

1. **Step 1 Complete**: Organization exists
2. **Step 2 Complete**: Cloud account exists OR cost records exist
3. **Step 3 Complete**: Budget set OR alert rule exists
4. **Onboarding Complete**: `onboardingCompletedAt` is not null

## Edge Cases Handled

- ✅ No active organization → Redirects to onboarding
- ✅ Onboarding partially completed → Resumes at current step
- ✅ User skips steps → Can use "Skip setup" button
- ✅ Returning users → Skip onboarding if already completed
- ✅ Optional fields → Budget and alerts are optional in Step 3

## Next Steps (Optional Enhancements)

1. **Progress Persistence**: Save step progress even if user navigates away
2. **Skip Confirmation**: Ask user to confirm before skipping
3. **Tutorial Tooltips**: Add guided tour for first-time users
4. **Sample Data**: Option to load sample data during onboarding

---

**Status**: ✅ **ONBOARDING FLOW COMPLETE**




