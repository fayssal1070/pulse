# Debug Endpoints

## `/api/debug/costs`

**Status**: ✅ Recommended (no underscore, better Vercel compatibility)

**Description**: Debug endpoint to check cost data for the active organization.

**Authentication**: Required (protected by `requireAuth`)

**Returns**:
```json
{
  "orgId": "string",
  "count": number,
  "minDate": "ISO string | null",
  "maxDate": "ISO string | null",
  "sum_30d": number,
  "count_30d": number,
  "awsAccount": {
    "id": "string",
    "lastSyncedAt": "ISO string | null"
  } | null
}
```

### Test Local

```bash
# 1. Start the dev server
npm run dev

# 2. Login and get session cookie (or use browser dev tools)
# After logging in, copy the session cookie from browser

# 3. Test the endpoint
curl -X GET http://localhost:3000/api/debug/costs \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response** (200 OK):
```json
{
  "orgId": "clx...",
  "count": 150,
  "minDate": "2024-01-01T00:00:00.000Z",
  "maxDate": "2024-01-15T00:00:00.000Z",
  "sum_30d": 1234.56,
  "count_30d": 45,
  "awsAccount": {
    "id": "clx...",
    "lastSyncedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Test on Vercel

```bash
# Replace YOUR_VERCEL_URL with your actual Vercel deployment URL
# Replace YOUR_SESSION_TOKEN with a valid session token from production

curl -X GET https://YOUR_VERCEL_URL/api/debug/costs \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

**To get session token from production**:
1. Login to your Vercel deployment
2. Open browser DevTools → Application → Cookies
3. Copy the value of `next-auth.session-token` (or `__Secure-next-auth.session-token` in production)

**Expected Response** (200 OK): Same format as local

**If 404**:
- Check that the latest commit is deployed (Vercel → Deployments → check commit hash)
- Verify the route exists: `app/api/debug/costs/route.ts`
- Check Vercel build logs for any errors

**If 401/403**:
- Verify session token is valid
- Check that user is authenticated
- Verify `requireAuth()` is working correctly

---

## `/api/_debug/costs` (Legacy)

**Status**: ⚠️ May be ignored by Vercel (underscore prefix)

**Description**: Original debug endpoint. Routes with underscore may be ignored by some Next.js/Vercel configurations.

**Recommendation**: Use `/api/debug/costs` instead.

**Note**: This route is kept for backward compatibility but may not work on all Vercel deployments.

---

## Troubleshooting

### 404 on Vercel

**Possible causes**:
1. **Deployment not up to date**: Check Vercel → Deployments → verify commit hash matches latest commit
2. **Route ignored**: Next.js may ignore routes with underscore prefix (`_debug`)
3. **Build error**: Check Vercel build logs for compilation errors

**Solution**:
- Use `/api/debug/costs` (without underscore)
- Verify latest commit is deployed
- Check Vercel build logs

### How to verify deployment is up to date

1. **Check commit hash**:
   ```bash
   git log -1 --format="%H"
   ```
2. **Compare with Vercel**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Find the latest deployment
   - Check the commit hash matches your local `git log`
3. **If mismatch**: Trigger a new deployment or wait for auto-deploy

### How to check if route exists in build

1. **Local build**:
   ```bash
   npm run build
   ```
2. **Check output**: Look for `ƒ /api/debug/costs` in the route list
3. **Vercel build logs**: Check Vercel → Deployments → Latest → Build Logs
   - Look for route compilation
   - Check for any errors related to `debug/costs`

---

## Why `/api/_debug/costs` may return 404

Next.js and Vercel may treat routes with underscore prefix (`_debug`) differently:
- Some Next.js configurations ignore routes starting with `_`
- Vercel build process may exclude these routes
- File system routing conventions may skip underscore-prefixed directories

**Solution**: Use `/api/debug/costs` (without underscore) for better compatibility.

