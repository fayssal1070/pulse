# PR20 Validation Checklist

This document outlines the steps to validate PR20: SDK build system, improved `/connect` page, and E2E testing capabilities.

## Prerequisites
- An active Pulse organization with an admin user.
- At least one AI provider connection configured (OpenAI recommended).
- At least one AI model route configured.
- An API key created (can be created via `/admin/ai` or `/developer`).

---

## 1) SDK Build System

**Objective**: Verify that the SDK can be built independently and outputs CJS, ESM, and TypeScript definitions.

1. **Build SDK**
   - **Action**: Run `npm run build:sdk` from the root directory.
   - **Expected Result**: 
     - SDK builds successfully
     - Output files created in `packages/pulse-openai/dist/`:
       - `index.js` (CJS)
       - `index.mjs` (ESM)
       - `index.d.ts` (TypeScript definitions)

2. **Verify Package.json Configuration**
   - **Check**: Inspect `packages/pulse-openai/package.json`
   - **Expected Result**: 
     - `"main": "./dist/index.js"` (CJS entry)
     - `"module": "./dist/index.mjs"` (ESM entry)
     - `"types": "./dist/index.d.ts"` (TypeScript definitions)
     - `"exports"` field configured correctly

3. **Next.js Build Isolation**
   - **Action**: Run `npm run build` (Next.js build)
   - **Expected Result**: 
     - Next.js build succeeds
     - No errors about `packages/pulse-openai` compilation
     - `packages/` directory is excluded from Next.js TypeScript compilation (check `tsconfig.json`)

---

## 2) `/connect` Page Improvements

**Objective**: Verify that the `/connect` page has user-friendly features for non-technical users.

1. **Access Connect Page**
   - **Action**: Navigate to `/connect` (logged in, any role).
   - **Expected Result**: Page loads successfully.

2. **Base URL Display**
   - **Action**: Check the "Base URL" section.
   - **Expected Result**: 
     - Base URL is displayed (e.g., `https://pulse-sigma-eight.vercel.app/api/v1`)
     - "Copy" button is present and functional
     - Clicking "Copy" copies the URL to clipboard

3. **API Key Section**
   - **Action**: Check the "API Key" section.
   - **Expected Result**: 
     - If no API keys exist: Shows message with link to create API key
     - If API keys exist: Shows input field and "Test Connection" button

4. **Test Connection Button**
   - **Action**: Enter a valid API key and click "Test Connection".
   - **Expected Result**: 
     - Button shows "Testing..." state
     - After completion, shows success/error message
     - Success message: "Connection successful! Found X models."
     - Error message: Clear error description

5. **Quick Start Section**
   - **Action**: Check the "Quick Start" section.
   - **Expected Result**: 
     - cURL snippet is displayed with correct base URL
     - "Copy" button is present and functional

6. **SDK Installation Section**
   - **Action**: Check the "SDK Installation" section.
   - **Expected Result**: 
     - npm install command is displayed
     - "Copy" button is present and functional

---

## 3) SDK Examples

**Objective**: Verify that SDK examples are present and functional (optional manual testing).

1. **Examples Directory**
   - **Check**: Verify `packages/pulse-openai/examples/` exists
   - **Expected Result**: 
     - `node-basic.ts` exists
     - `nextjs-route.ts` exists

2. **Example Content** (Optional Manual Test)
   - **Action**: Review example files
   - **Expected Result**: 
     - Examples show proper usage of Pulse OpenAI SDK
     - Examples include attribution headers
     - Examples include streaming support

---

## 4) E2E Tests for OpenAI Endpoints

**Objective**: Verify that E2E tests can validate OpenAI-compatible endpoints.

1. **Access E2E Page**
   - **Action**: Navigate to `/admin/e2e` (admin only).
   - **Expected Result**: E2E checklist page loads.

2. **OpenAI-compat Endpoints Check** (if implemented)
   - **Action**: Look for a check item "OpenAI-compat endpoints OK" or similar.
   - **Expected Result**: 
     - Check item is present
     - Shows status (OK/KO)
     - Can be manually triggered or runs automatically

3. **Test OpenAI Endpoints** (Manual)
   - **Action**: Create an API key if needed, then test endpoints:
     - `GET /api/v1/models` (should return list of models)
     - `POST /api/v1/chat/completions` (should return completion)
     - `POST /api/v1/chat/completions?stream=true` (should return SSE stream)
   - **Expected Result**: All endpoints respond correctly.

4. **Verify Cost Events**
   - **Action**: After making API calls, check database or `/admin/usage/export`.
   - **Expected Result**: 
     - `CostEvent` records are created for each API call
     - `AiRequestLog` records are created
     - Costs are correctly attributed

---

## 5) Integration Testing

**Objective**: Verify that the SDK can be used in a real application (optional).

1. **Install SDK** (Optional)
   - **Action**: In a test project, install the built SDK:
     ```bash
     npm install ./packages/pulse-openai
     ```
   - **Expected Result**: Package installs successfully.

2. **Use SDK** (Optional)
   - **Action**: Import and use the SDK in a test script:
     ```typescript
     import { PulseOpenAI } from '@pulse/openai'
     
     const client = new PulseOpenAI({
       baseURL: 'https://pulse-sigma-eight.vercel.app/api/v1',
       apiKey: 'your_key_here',
     })
     
     const completion = await client.chat.completions.create({
       model: 'gpt-4',
       messages: [{ role: 'user', content: 'Hello!' }],
     })
     ```
   - **Expected Result**: SDK works correctly, makes requests to Pulse API.

---

## Summary

PR20 adds:
- ✅ SDK build system (tsup with CJS+ESM+types)
- ✅ Improved `/connect` page (test connection, copy buttons)
- ✅ SDK examples (Node, Next.js)
- ✅ Build script (`npm run build:sdk`)
- ⏳ E2E tests for OpenAI endpoints (may be added incrementally)

The core functionality (SDK build, `/connect` improvements) is ready. E2E tests can be added incrementally if needed.

