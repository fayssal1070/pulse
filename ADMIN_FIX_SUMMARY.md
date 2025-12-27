# Admin Leads Redirect Fix - Summary

## Problem Identified

**File**: `app/admin/leads/page.tsx` (line 24)

The redirect to `/dashboard` was happening because the page was checking if the user is an organization owner:
```typescript
const isOwner = await Promise.all(
  organizations.map(org => isOrganizationOwner(org.id, user.id))
).then(results => results.some(r => r))

if (!isOwner) {
  redirect('/dashboard')
}
```

This meant that users who just created an account (and don't own any organizations yet) were being redirected to `/dashboard` even if they should have admin access.

## Solution Implemented

### 1. Created Admin Allowlist System

**New File**: `lib/admin-helpers.ts`

- `isAdmin()`: Checks if current user's email is in `ADMIN_EMAILS` env var
- `requireAdmin()`: Throws error if user is not admin (for API routes)

**How it works**:
- Reads `ADMIN_EMAILS` environment variable (comma-separated list)
- Compares user's email (case-insensitive) against the list
- Returns `true` if email is in the list, `false` otherwise

### 2. Updated Admin Leads Page

**File**: `app/admin/leads/page.tsx`

**Changes**:
- Removed organization owner check
- Now uses `isAdmin()` from `lib/admin-helpers.ts`
- Redirects non-admin users to `/dashboard?error=admin_required`
- Still requires authentication (via `requireAuth()`)

**Before**:
```typescript
const isOwner = await Promise.all(
  organizations.map(org => isOrganizationOwner(org.id, user.id))
).then(results => results.some(r => r))

if (!isOwner) {
  redirect('/dashboard')
}
```

**After**:
```typescript
const isAdminUser = await isAdmin()

if (!isAdminUser) {
  redirect('/dashboard?error=admin_required')
}
```

### 3. Added Error Message on Dashboard

**File**: `app/dashboard/page.tsx`

**Changes**:
- Added `searchParams` prop to accept `error` parameter
- Displays yellow warning banner when `error=admin_required`
- Message: "Admin Access Required - You need to be added to the admin allowlist..."

## Environment Variable Required

### Vercel Environment Variable

**Name**: `ADMIN_EMAILS`

**Value**: Comma-separated list of admin email addresses

**Example**:
```
ADMIN_EMAILS=admin@example.com,owner@example.com,superadmin@example.com
```

**Notes**:
- Emails are compared case-insensitively
- Whitespace around emails is trimmed
- Empty values are filtered out
- If `ADMIN_EMAILS` is not set, no one has admin access

## Files Modified

1. ✅ `lib/admin-helpers.ts` - **NEW FILE** - Admin allowlist helper functions
2. ✅ `app/admin/leads/page.tsx` - Updated to use admin allowlist instead of organization owner check
3. ✅ `app/dashboard/page.tsx` - Added error message display for non-admin users

## Testing Steps

### Test 1: Incognito User (Not Logged In)
1. Open incognito window
2. Navigate to `/admin/leads`
3. **Expected**: Redirected to `/login` (middleware protection)
4. ✅ **Status**: Should work (middleware already handles this)

### Test 2: Logged In as Admin
1. Set `ADMIN_EMAILS=admin@example.com` in Vercel
2. Login with `admin@example.com`
3. Navigate to `/admin/leads`
4. **Expected**: Page loads successfully, shows leads table
5. ✅ **Status**: Should work after setting env var

### Test 3: Logged In as Non-Admin
1. Login with `user@example.com` (not in `ADMIN_EMAILS`)
2. Navigate to `/admin/leads`
3. **Expected**: Redirected to `/dashboard?error=admin_required`
4. **Expected**: Yellow warning banner appears on dashboard
5. ✅ **Status**: Should work

### Test 4: ADMIN_EMAILS Not Set
1. Remove `ADMIN_EMAILS` from Vercel (or set to empty)
2. Login with any user
3. Navigate to `/admin/leads`
4. **Expected**: Redirected to `/dashboard?error=admin_required` (no one has admin access)
5. ✅ **Status**: Should work

## Security Notes

- ✅ Authentication is still required (`requireAuth()` is called first)
- ✅ Incognito users are redirected to `/login` by middleware
- ✅ Admin check happens after authentication
- ✅ Email comparison is case-insensitive (more user-friendly)
- ✅ If `ADMIN_EMAILS` is not set, no one has admin access (secure by default)

## Next Steps

1. **Set `ADMIN_EMAILS` on Vercel**:
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add: `ADMIN_EMAILS` = `your-admin-email@example.com`
   - Redeploy

2. **Test the flow**:
   - Test incognito → should redirect to `/login`
   - Test admin user → should access `/admin/leads`
   - Test non-admin user → should redirect to `/dashboard` with message

3. **Verify**:
   - Check that leads table loads for admin users
   - Check that non-admin users see the warning message

---

**Status**: ✅ **FIX COMPLETE - READY FOR DEPLOYMENT**



