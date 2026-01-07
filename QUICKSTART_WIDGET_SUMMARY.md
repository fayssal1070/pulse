# Quickstart Widget - Summary

## Where It Appears

### Dashboard (`/dashboard`)
**Location**: After onboarding is completed, appears at the top of the main content area (after Setup Complete Banner, before Totals section)

**Visibility Conditions**:
- ✅ User has completed onboarding (`onboardingStatus.completed === true`)
- ✅ User has an active organization (`activeOrgId` exists)
- ❌ Hidden during onboarding (Setup Progress Widget shown instead)

**Exact Code Location**: `app/dashboard/page.tsx` line ~157-163

```tsx
{/* Quickstart Widget */}
{activeOrgId && onboardingStatus?.completed && (
  <QuickstartWidget
    hasCostData={hasCostData}
    hasAlerts={hasAlerts}
    organizationId={activeOrgId}
  />
)}
```

## Widget Design

### Visual Style
- **Background**: Gradient blue (`from-blue-50 to-indigo-50`)
- **Border**: Blue border (`border-blue-200`)
- **Header**: Shows "Quickstart Guide" with progress counter (X/4 completed)
- **Steps**: Each step in a card with:
  - Number badge (blue for info steps, green when completed)
  - Step label
  - Action button/link on the right

### 4 Steps

#### Step 1: Download CSV template
- **Status**: Always shown as info (can't track downloads)
- **Action**: "Download →" button (downloads template)
- **Completion**: Not tracked (always shows as info step)

#### Step 2: Learn how to export CSV from your cloud provider
- **Status**: Always shown as info
- **Action**: "View Guide →" link (goes to `/help/import-csv`)
- **Completion**: Not tracked (always shows as info step)

#### Step 3: Import your cost data
- **Status**: ✅ Completed if `hasCostData === true`
- **Action**: "Import CSV →" link (goes to `/import`) OR "Create organization first" (if no org)
- **Completion**: Based on `costRecordsCount > 0`

#### Step 4: Create your first alert
- **Status**: ✅ Completed if `hasAlerts === true`
- **Action**: "Create Alert →" link (goes to `/organizations/{id}/alerts`) OR "Create organization first" (if no org)
- **Completion**: Based on `alertRulesCount > 0`

### Completion Message
When all 4 steps are completed:
- Shows green success banner: "🎉 All set! You're ready to track and optimize your cloud costs."

## How Progress is Calculated

### Step 1 & 2 (Info Steps)
- **Completion**: Not tracked (always show as info/not completed)
- **Reason**: Cannot reliably track template downloads or help page visits
- **Visual**: Blue badge, not checked off

### Step 3: Import Cost Data
**Calculation**: 
```typescript
const costRecordsCount = await prisma.costRecord.count({ 
  where: { orgId: activeOrgId } 
})
hasCostData = costRecordsCount > 0
```

**Completed When**: Organization has at least 1 cost record in database

**Visual**: 
- ✅ Green badge with checkmark when completed
- ⚪ Blue/gray badge with number when not completed
- Label is strikethrough when completed

### Step 4: Create First Alert
**Calculation**:
```typescript
const alertRulesCount = await prisma.alertRule.count({ 
  where: { orgId: activeOrgId } 
})
hasAlerts = alertRulesCount > 0
```

**Completed When**: Organization has at least 1 alert rule in database

**Visual**:
- ✅ Green badge with checkmark when completed
- ⚪ Blue/gray badge with number when not completed
- Label is strikethrough when completed

### Overall Progress Counter
**Display**: `{completedCount}/{totalSteps}` (e.g., "2/4 completed")

**Calculation**:
```typescript
const completedCount = steps.filter(s => s.completed).length
// Only Step 3 and Step 4 can be completed
// So max is 2/4 (if both cost data and alerts exist)
```

## Files Created/Modified

1. ✅ `components/quickstart-widget.tsx` - **NEW** - Quickstart widget component
2. ✅ `app/dashboard/page.tsx` - **MODIFIED** - Added widget and progress calculation
   - Added `hasCostData` and `hasAlerts` checks
   - Renders widget after onboarding completion

## User Experience

### First Time User (After Onboarding)
1. Sees Quickstart Widget with 0/4 completed
2. Step 1: Downloads template (info step, stays blue)
3. Step 2: Views help guide (info step, stays blue)
4. Step 3: Imports CSV → Progress updates to 1/4
5. Step 4: Creates alert → Progress updates to 2/4
6. Widget shows completion message

### Returning User (Has Data)
- Widget shows 2/4 completed (if has both cost data and alerts)
- Steps 3 and 4 are checked off with green badges
- Completion message visible

### User Without Organization
- Steps 3 and 4 show "Create organization first" (disabled state)
- No action buttons available

## Design Principles

✅ **Simple and Obvious**:
- Clear numbered steps
- Visual progress indicator (X/4)
- Color-coded badges (blue = info, green = done)
- Direct action buttons/links

✅ **No Confusion**:
- Steps 1-2 are clearly informational (can't be "completed")
- Steps 3-4 show actual progress
- Completion state is visually distinct
- Actions are contextual (disabled if no org)

✅ **Non-Intrusive**:
- Only shows after onboarding (doesn't interfere with setup)
- Can be ignored if user wants to explore on their own
- Completion message is celebratory, not pushy

## Testing Checklist

- [ ] Widget appears after onboarding completion
- [ ] Widget hidden during onboarding
- [ ] Progress shows 0/4 for new users
- [ ] Step 1 downloads template correctly
- [ ] Step 2 links to help page
- [ ] Step 3 shows "Import CSV" when org exists
- [ ] Step 3 shows "Create organization first" when no org
- [ ] Step 3 updates to completed after CSV import
- [ ] Step 4 shows "Create Alert" when org exists
- [ ] Step 4 shows "Create organization first" when no org
- [ ] Step 4 updates to completed after alert creation
- [ ] Progress counter updates correctly (0/4 → 1/4 → 2/4)
- [ ] Completion message appears when 2/4 completed
- [ ] Widget responsive on mobile

---

**Status**: ✅ **QUICKSTART WIDGET COMPLETE**

**Where It Appears**: Dashboard (after onboarding completion)

**Progress Calculation**: 
- Step 3: `costRecordsCount > 0`
- Step 4: `alertRulesCount > 0`
- Steps 1-2: Not tracked (info only)






