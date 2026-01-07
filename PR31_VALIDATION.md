# PR31 — Public Pricing & Commercial Activation — Validation Checklist

## Objective
Verify that Pulse is now a sellable product with clear pricing, accessible from everywhere, and no technical jargon exposed to end users.

---

## 1. Pricing Page (/pricing)

### ✅ Test: Public pricing page is accessible and clear

**Steps:**
1. Navigate to `/pricing` (no auth required)
2. Verify all 3 plans are displayed:
   - STARTER — 29€/month
   - PRO — 149€/month (with "Most Popular" badge)
   - BUSINESS — 499€/month
3. Verify each plan shows:
   - Price clearly
   - Included AI usage quota (EUR)
   - User limits
   - Key features
   - Clear value proposition

**Expected:**
- Page loads without authentication
- All information is in euros, not tokens
- CTAs: STARTER → "Start Free", PRO/BUSINESS → "Upgrade"
- FAQ section explains overage billing

---

## 2. Pricing Links from Landing Page

### ✅ Test: Landing page links to pricing

**Steps:**
1. Navigate to `/` (public landing)
2. Verify "View Pricing" button is prominent
3. Click button → should go to `/pricing`

**Expected:**
- Pricing CTA visible in hero section
- Link works correctly

---

## 3. Pricing Links from Dashboard

### ✅ Test: PlanCard links to pricing

**Steps:**
1. Log in as admin
2. Navigate to `/dashboard`
3. Find PlanCard component
4. Verify button says "Upgrade" (if STARTER) or "View Plans"
5. Click → should go to `/pricing`

**Expected:**
- PlanCard visible on dashboard
- Button links to `/pricing`

---

## 4. UpgradeRequired Component

### ✅ Test: Upgrade prompts link to pricing

**Steps:**
1. Trigger an upgrade-required scenario (e.g., try to enable Slack on STARTER)
2. Verify UpgradeRequired component appears
3. Check "View Pricing" button links to `/pricing`

**Expected:**
- UpgradeRequired component displays
- "View Pricing" button goes to `/pricing`
- "Go to Billing" still goes to `/billing`

---

## 5. Billing Page Links

### ✅ Test: Billing page links to pricing

**Steps:**
1. Navigate to `/billing` (as admin)
2. Verify "View Pricing & Upgrade" button
3. Click → should go to `/pricing`

**Expected:**
- Button visible and functional
- Removed old prompt-based plan selection

---

## 6. Connect Page Commercial Messaging

### ✅ Test: /connect page sells Pulse value

**Steps:**
1. Navigate to `/connect`
2. Verify "Why route your AI traffic through Pulse?" section shows:
   - Unified Billing
   - Cost Control
   - Multi-Provider Routing
   - Zero Vendor Lock-in
3. Verify diagram shows: `Your app → Pulse → OpenAI / Claude / Gemini`
4. Check that technical details (API keys, URLs) are still present

**Expected:**
- Commercial value proposition clearly displayed
- Technical information still accessible for developers
- No contradictions

---

## 7. Billing Page Usage Display

### ✅ Test: /billing shows quota, usage, overage clearly

**Steps:**
1. Navigate to `/billing` (as admin)
2. Verify "Usage & Billing" section shows:
   - Included Quota (EUR)
   - Current Usage (EUR)
   - Estimated Overage (if applicable) OR Remaining
   - Progress bar
3. Verify message: "No surprise billing. You see your usage live."

**Expected:**
- Usage data displayed in euros only
- Progress bar is color-coded (green/yellow/orange/red)
- Overage calculation visible if over quota
- Clear explanation of overage billing

---

## 8. No Token Mentions (User-Facing UI)

### ✅ Test: User-facing UI never mentions tokens

**Steps:**
1. Check these pages/components:
   - `/pricing`
   - `/billing`
   - `/dashboard` (cards)
   - `/usage`
   - UpgradeRequired component
   - PlanCard component
2. Search for "token" or "Token" (case-insensitive)
3. Verify no user-facing text mentions tokens

**Expected:**
- All pricing/usage displayed in euros
- Technical logs may still show tokens (acceptable for admin views)
- Error messages don't mention tokens

**Note:** Backend API responses may include tokens for developers, which is acceptable. Only user-facing UI matters.

---

## 9. Upgrade Flow

### ✅ Test: STARTER → PRO upgrade works

**Steps:**
1. Set org to STARTER plan
2. Navigate to `/pricing`
3. Click "Upgrade" on PRO plan
4. Verify redirect to `/billing?plan=PRO`
5. Complete checkout flow
6. Verify plan upgrade is reflected immediately

**Expected:**
- Upgrade flow works end-to-end
- Features unlock immediately after payment
- No errors during checkout

---

## 10. Upgrade from Feature Block

### ✅ Test: Upgrade from blocked feature

**Steps:**
1. Set org to STARTER
2. Try to enable Slack notifications (PRO+ feature)
3. Verify UpgradeRequired component appears
4. Click "View Pricing"
5. Verify navigation to `/pricing`
6. Complete upgrade
7. Return to feature → should now be enabled

**Expected:**
- UpgradeRequired → Pricing → Checkout → Feature enabled
- Flow is smooth and logical

---

## 11. Pricing Page Accessibility

### ✅ Test: Pricing page is public

**Steps:**
1. Open incognito/private window
2. Navigate to `/pricing`
3. Verify page loads without login

**Expected:**
- Page accessible without authentication
- No redirect to login
- All pricing information visible

---

## 12. CFO Test (30-Second Comprehension)

### ✅ Test: Non-technical user understands pricing

**Steps:**
1. Ask a non-technical person to view `/pricing`
2. Give them 30 seconds
3. Ask them to explain:
   - What they would pay
   - What they get
   - What happens if they exceed quota

**Expected:**
- Person can answer all questions
- No confusion about "tokens" or technical details
- Overage billing concept is clear

---

## 13. Developer Test (URL Clarity)

### ✅ Test: Developer knows what URL to use

**Steps:**
1. Navigate to `/connect`
2. Verify Base URL is clearly displayed
3. Verify API key instructions are clear
4. Verify code examples work

**Expected:**
- Developer can copy/paste URL immediately
- Instructions are clear
- Examples are functional

---

## 14. Admin Test (Upgrade Reason)

### ✅ Test: Admin understands why to upgrade

**Steps:**
1. Log in as admin on STARTER plan
2. Navigate to dashboard
3. Check if clear upgrade prompts exist
4. Navigate to `/pricing`
5. Verify comparison between plans is clear

**Expected:**
- Admin can see what they're missing
- Upgrade benefits are obvious
- Pricing is transparent

---

## Summary

- [ ] /pricing page exists and is public
- [ ] Landing page links to pricing
- [ ] Dashboard PlanCard links to pricing
- [ ] UpgradeRequired links to pricing
- [ ] Billing page links to pricing
- [ ] /connect has commercial messaging
- [ ] /billing shows usage/quota/overage clearly
- [ ] No token mentions in user-facing UI
- [ ] STARTER → PRO upgrade works
- [ ] Upgrade from feature block works
- [ ] Pricing page is public
- [ ] CFO test passes (30-second comprehension)
- [ ] Developer test passes (URL clarity)
- [ ] Admin test passes (upgrade reason)
- [ ] Build passes

---

## Notes

- **Tokens in Logs:** It's acceptable for admin/technical views (like `/governance` or `/logs`) to show tokens, as these are for technical debugging. Only customer-facing UI (pricing, billing, usage) must use EUR.

- **API Responses:** Developer-facing API responses may include tokens for compatibility with OpenAI SDK. This is acceptable.

- **Overage Messaging:** Ensure the message "Usage beyond included quota is automatically billed at the end of each month — no service interruptions" is visible where relevant.

