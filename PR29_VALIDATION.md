# PR29 Validation - Seats-based Billing & Member Enforcement

## Overview
This document validates the implementation of PR29: Seat-based billing with member enforcement.

## Prerequisites

### Database Migration
- Run migration: `prisma/migrations/20250113000001_add_seats_and_membership_status/migration.sql`
- Verify `Organization` table has `seatLimit` and `seatEnforcement` columns
- Verify `Membership` table has `status`, `invitedAt`, `activatedAt` columns

### Plan Configuration
- STARTER plan: 1 seat
- PRO plan: 5 seats
- BUSINESS plan: 25 seats

## Test Checklist

### 1. STARTER Plan → Invite 2nd User → Blocked + Upgrade UI
**Test**:
- [ ] Create organization with STARTER plan (or set plan to STARTER)
- [ ] Verify organization has 1 active member (owner)
- [ ] Navigate to `/settings/members` (or invitation page)
- [ ] Try to invite a new member
- [ ] API should return 402/403 with `{code:"upgrade_required", feature:"seats", ...}`
- [ ] UI should display `UpgradeRequired` component
- [ ] Message should indicate seat limit reached (1/1)
- [ ] Required plan should be PRO
- [ ] Click "Go to Billing" → should navigate to `/billing`

### 2. PRO Plan → Invite 6th User → Blocked
**Test**:
- [ ] Upgrade organization to PRO plan (via Stripe or manual update)
- [ ] Verify organization has 5 active members
- [ ] Try to invite 6th member
- [ ] Should be blocked with upgrade_required error
- [ ] Required plan should be BUSINESS
- [ ] UI shows clear message: "Seat limit reached (5/5). Upgrade to BUSINESS plan"

### 3. Stripe Upgrade PRO → BUSINESS → seatLimit Updated
**Test**:
- [ ] Start with PRO plan (5 seats)
- [ ] Verify `Organization.seatLimit = 5`
- [ ] Trigger Stripe webhook `customer.subscription.updated` for upgrade to BUSINESS
- [ ] Verify webhook processes correctly
- [ ] Check database: `Organization.plan` should be `BUSINESS`
- [ ] Check database: `Organization.seatLimit` should be `25`
- [ ] Verify `/api/billing/seats` returns `limit: 25`

### 4. User Existing > Limit → Warning Visible, Access Preserved
**Test**:
- [ ] Create organization with 6 members on PRO plan (seatLimit = 5)
- [ ] Set one member to `status = 'active'` (manually if needed)
- [ ] Verify organization shows 6 active members (over limit)
- [ ] Navigate to `/settings/members`
- [ ] Should see warning badge: "Seat limit exceeded" or similar
- [ ] Existing members should NOT be automatically suspended
- [ ] Existing members should still have access
- [ ] New invitations should be blocked
- [ ] `/api/billing/seats` should return `used: 6, limit: 5, available: -1` (negative)

### 5. RBAC Intact → Admin/Finance Only for Invites
**Test**:
- [ ] As regular member (not admin/finance):
  - [ ] Try to access `/settings/members` → should be blocked or read-only
  - [ ] Try to POST `/api/invitations` → should return 403
- [ ] As admin/finance:
  - [ ] Can access `/settings/members`
  - [ ] Can send invitations (if seats available)
  - [ ] Can see seat usage information

### 6. /api/billing/seats Returns Correct Data
**Test**:
- [ ] Call `GET /api/billing/seats` as authenticated user
- [ ] Verify response includes:
  - `used`: number of active memberships
  - `limit`: seat limit from organization
  - `available`: limit - used (can be negative if over limit)
  - `enforcement`: boolean (seatEnforcement flag)
- [ ] Test with different plans:
  - STARTER: limit = 1
  - PRO: limit = 5
  - BUSINESS: limit = 25

### 7. Membership Status Tracking
**Test**:
- [ ] Invite a new member via `/api/invitations`
- [ ] Check database: `Membership.status` should be `'invited'`
- [ ] Check database: `Membership.invitedAt` should be set
- [ ] Check database: `Membership.activatedAt` should be `null`
- [ ] Accept invitation via `/api/invitations/[token]/accept`
- [ ] Check database: `Membership.status` should be `'active'`
- [ ] Check database: `Membership.activatedAt` should be set

### 8. Seat Enforcement Disabled → No Blocking
**Test**:
- [ ] Set `Organization.seatEnforcement = false`
- [ ] Verify organization has active members >= seatLimit
- [ ] Try to invite new member
- [ ] Should succeed (enforcement disabled)
- [ ] Set `seatEnforcement = true` again
- [ ] Verify blocking works again

### 9. Dashboard Seats Card Displays Correctly
**Test**:
- [ ] Navigate to `/dashboard` as admin
- [ ] Verify seats card appears with `data-testid="seats-card"`
- [ ] Shows "Used / Limit" (e.g., "3 / 5")
- [ ] Shows "Upgrade" button if at limit or near limit
- [ ] Click "Upgrade" → should navigate to `/billing`

### 10. /settings/members Page Shows Seat Information
**Test**:
- [ ] Navigate to `/settings/members` as admin
- [ ] Verify header shows: "Seats used: X / Y"
- [ ] If at limit, shows badge: "Seat limit reached"
- [ ] "Invite member" button disabled if at limit
- [ ] Shows `UpgradeRequired` component if limit reached
- [ ] List shows all members with:
  - Email/name
  - Role
  - Status (active/invited/suspended)
  - Activated date

## Database Schema Validation

### Organization Table
- [ ] `seatLimit` column exists (Int, default 1)
- [ ] `seatEnforcement` column exists (Boolean, default true)
- [ ] Indexes exist if needed

### Membership Table
- [ ] `status` column exists (String, default 'active')
- [ ] `invitedAt` column exists (DateTime, nullable)
- [ ] `activatedAt` column exists (DateTime, nullable)
- [ ] Index on `status` exists
- [ ] Index on `(orgId, status)` exists

## API Endpoints Validation

### GET /api/billing/seats
- [ ] Requires authentication
- [ ] Returns seat usage information
- [ ] Handles missing active organization gracefully
- [ ] Calculates used seats correctly (counts active memberships only)

### POST /api/invitations
- [ ] Checks seat availability before creating invitation
- [ ] Returns upgrade_required error if limit reached
- [ ] Creates membership with `status = 'invited'`
- [ ] Sets `invitedAt` timestamp

### POST /api/invitations/[token]/accept
- [ ] Checks seat availability before activating
- [ ] Updates membership: `status = 'active'`, sets `activatedAt`
- [ ] Returns upgrade_required if limit would be exceeded

## Integration Points

### Stripe Webhooks
- [ ] `customer.subscription.created/updated` → updates `seatLimit` based on plan
- [ ] `customer.subscription.deleted` → resets `seatLimit` to STARTER (1)
- [ ] Plan changes trigger seatLimit updates correctly

### Entitlements
- [ ] `getSeatLimit(plan)` returns correct values
- [ ] `assertSeatAvailable(orgId)` throws EntitlementError with upgrade_required
- [ ] Error includes feature: 'seats', requiredPlan, message

## Expected Behavior Summary

### Seat Enforcement Flow
1. Admin invites member → `assertSeatAvailable()` checks limit
2. If limit reached → EntitlementError thrown → 402/403 response
3. Client catches error → displays UpgradeRequired component
4. User upgrades → Stripe webhook updates seatLimit → invitations work again

### Over Limit Handling
- Existing members over limit are NOT suspended
- They retain access
- New invitations are blocked
- UI shows warning but doesn't break

### Migration Safety
- Existing memberships default to `status = 'active'`
- Existing organizations get default seatLimit based on plan
- No data loss during migration

## Notes
- Seat enforcement is opt-out (can disable via `seatEnforcement = false`)
- Seat counts only `status = 'active'` memberships
- Invited/suspended members don't count toward limit
- Migration sets defaults safely (IF NOT EXISTS)
- Build should pass with TypeScript strict mode

