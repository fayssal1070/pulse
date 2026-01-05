# PR21 Validation Checklist

This document outlines the steps to validate PR21: E2E OpenAI-compatible API smoke tests.

## Prerequisites
- An active Pulse organization with an admin user.
- At least one AI provider connection configured (OpenAI recommended).
- At least one AI model route configured (e.g., `gpt-4`).
- At least one App created (for budget enforcement test).

---

## 1) Access E2E Page

**Objective**: Verify that the E2E page is accessible and shows the new OpenAI Compat API section.

1. **Navigate to E2E Page**
   - **Action**: Go to `/admin/e2e` (admin only).
   - **Expected Result**: Page loads successfully with existing checks and new "OpenAI Compat API" section.

2. **Verify OpenAI Compat API Section**
   - **Action**: Scroll to "OpenAI Compat API" section.
   - **Expected Result**: 
     - Section header "OpenAI Compat API" is visible
     - "Run OpenAI Smoke Tests" button is present
     - No test results displayed initially

---

## 2) Run OpenAI Smoke Tests

**Objective**: Verify that the smoke tests execute and return results.

1. **Click "Run OpenAI Smoke Tests"**
   - **Action**: Click the "Run OpenAI Smoke Tests" button.
   - **Expected Result**: 
     - Button shows "Running tests..." state
     - After completion (10-30 seconds), test results appear

2. **Verify Test Results Display**
   - **Expected Result**: 
     - Test results section appears with overall status (All Passed / Some Failed)
     - 5 test items are listed:
       - GET /api/v1/models
       - POST /api/v1/chat/completions (non-stream)
       - POST /api/v1/chat/completions (stream=true)
       - Logging: AiRequestLog and CostEvent created
       - Budget enforcement
     - Each test shows ✓ or ✗ with duration

---

## 3) Verify Individual Tests

**Objective**: Verify that each test passes and provides meaningful details.

1. **Test 1: GET /api/v1/models**
   - **Expected Result**: 
     - Status: ✓ (passed)
     - Details show modelCount > 0
     - Duration: < 5 seconds

2. **Test 2: POST /api/v1/chat/completions (non-stream)**
   - **Expected Result**: 
     - Status: ✓ (passed)
     - Details show content preview
     - Duration: < 30 seconds

3. **Test 3: POST /api/v1/chat/completions (stream=true)**
   - **Expected Result**: 
     - Status: ✓ (passed)
     - Details show chunkCount >= 2
     - Duration: < 30 seconds

4. **Test 4: Logging Verification**
   - **Expected Result**: 
     - Status: ✓ (passed)
     - Details show requestLogs > 0 and costEvents > 0
     - Duration: < 5 seconds

5. **Test 5: Budget Enforcement**
   - **Expected Result**: 
     - Status: ✓ (passed) or reasonable status
     - Details show test completed
     - Duration: < 15 seconds

---

## 4) Verify Database State

**Objective**: Verify that tests created logs and cost events, and cleaned up properly.

1. **Check Cost Events**
   - **Action**: Go to `/costs` or `/admin/usage/export`.
   - **Expected Result**: 
     - New CostEvent entries exist for the test API calls
     - Provider is "OPENAI" (or configured provider)
     - Costs are non-zero

2. **Check AI Request Logs** (if accessible)
   - **Action**: Check database or logs endpoint (if available).
   - **Expected Result**: 
     - AiRequestLog entries exist for the test requests
     - Logs include model, tokens, cost information

3. **Verify Test API Key Cleanup**
   - **Action**: Go to `/admin/ai` and check API keys list.
   - **Expected Result**: 
     - No API keys with label "e2e-test-temporary" exist
     - (If cleanup failed, a warning is shown in test results)

---

## 5) Verify No Secrets Exposed

**Objective**: Verify that test results don't expose sensitive information.

1. **Check Test Results JSON**
   - **Action**: Click "Copy JSON" button and inspect the JSON.
   - **Expected Result**: 
     - No full API keys are present in the JSON
     - Only test metadata, durations, and error messages are included
     - No sensitive credentials are exposed

2. **Check Network Tab** (Optional)
   - **Action**: Open browser DevTools, check Network tab during test run.
   - **Expected Result**: 
     - API key is sent in Authorization header (expected)
     - No API keys are exposed in response bodies
     - Test results don't include full key values

---

## 6) Verify Logs Retention Unaffected

**Objective**: Verify that E2E tests don't interfere with log retention.

1. **Check Log Retention Settings**
   - **Action**: Verify that `aiLogRetentionDays` setting is unchanged.
   - **Expected Result**: 
     - Retention settings are unchanged
     - Test logs are treated like regular logs (subject to retention)

2. **Verify Test Data Doesn't Break Retention** (Optional)
   - **Action**: Wait for retention period or manually check.
   - **Expected Result**: 
     - Test logs are subject to same retention rules as production logs
     - No issues with retention job processing test data

---

## Summary

PR21 adds comprehensive E2E smoke tests for OpenAI-compatible endpoints:
- ✅ GET /api/v1/models validation
- ✅ POST /api/v1/chat/completions (non-stream) validation
- ✅ POST /api/v1/chat/completions (streaming) validation
- ✅ Logging verification (AiRequestLog + CostEvent)
- ✅ Budget enforcement test
- ✅ Safe test key management (create, use, cleanup)
- ✅ Admin-only endpoint with RBAC protection
- ✅ Comprehensive test report with timings and errors

All tests should pass in a properly configured environment. If any test fails, the error message should provide clear diagnostic information.

