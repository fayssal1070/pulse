# AWS Connect Wizard - Click-by-Click Guide

## Overview
This guide provides exact click-by-click instructions for connecting AWS to PULSE. Two methods available:
1. **CloudFormation (Recommended)**: 1-click deploy - ~2 minutes
2. **Manual Setup**: Step-by-step IAM configuration - ~5 minutes

**Important**: AWS Cost Explorer updates data every 24 hours. PULSE syncs once daily by default. Manual syncs are rate-limited to once every 6 hours.

---

## Part 1: In PULSE (2 minutes)

### Step 1: Navigate to Connect AWS
1. **Log in** to PULSE
2. **Click** on your organization name in the dashboard (or navigate to organization page)
3. **Click** the **"Cloud Accounts"** button (top right, purple button)
4. **Click** the **"+ Connect AWS"** button (top right)
5. You should now see the **Connect AWS** wizard page

**URL**: `/organizations/[id]/cloud-accounts/connect/aws`

**📸 Screenshot Placeholder**: Organization page → Cloud Accounts button → Connect AWS page

### Step 2: Copy External ID
1. On the Connect AWS page, scroll to **Step 1: Generate External ID**
2. You'll see a UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
3. **Click** the **"Copy"** button next to the External ID
4. **Keep this page open** - you'll need it later

**📸 Screenshot Placeholder**: Step 1 showing External ID with Copy button highlighted

### Step 3: Copy Trust Policy JSON
1. Scroll to **Step 2: Create IAM Role in AWS**
2. Find **Step 2.2: Configure Trust Policy**
3. In the **Trust Policy JSON** box, **click** the **"Copy JSON"** button
4. The JSON is now in your clipboard

**📸 Screenshot Placeholder**: Step 2.2 with Trust Policy JSON and Copy JSON button

**Note**: The Trust Policy already contains the correct Principal ARN: `arn:aws:iam::298199649603:root`. Do not modify it.

### Step 4: Copy Permissions Policy JSON
1. Scroll to **Step 2.3: Add Permissions Policy**
2. In the **Permissions Policy JSON** box, **click** the **"Copy JSON"** button
3. The JSON is now in your clipboard

**📸 Screenshot Placeholder**: Step 2.3 with Permissions Policy JSON and Copy JSON button

---

## Part 2: In AWS Console

**Note**: If using CloudFormation (recommended), follow Step 4A. If using manual setup, follow Step 4B.

### Step 5: (Manual Setup Only) Open AWS IAM Console
1. **Open a new browser tab**
2. **Navigate to**: https://console.aws.amazon.com/iam
3. **Sign in** with your AWS account credentials
4. In the **left navigation menu**, **click** **"Roles"**
5. **Click** the **"Create role"** button (top right, blue button)

**📸 Screenshot Placeholder**: AWS IAM Console → Roles page → Create role button

### Step 6: Configure Trust Policy
1. On the "Select trusted entity" page:
   - **Select** the radio button for **"Custom trust policy"** (not "AWS service")
   - **Click** the **"Edit"** button (opens JSON editor)
2. In the JSON editor:
   - **Select all** existing content (Ctrl+A / Cmd+A)
   - **Delete** it (Delete key)
   - **Paste** the Trust Policy JSON you copied from PULSE (Ctrl+V / Cmd+V)
   - **Verify** the Principal ARN is: `arn:aws:iam::298199649603:root`
   - **Verify** the External ID matches the one from PULSE Step 1
3. **Click** the **"Next"** button (bottom right)

**📸 Screenshot Placeholder**: AWS IAM Trust Policy editor with pasted JSON showing Principal ARN

**Expected Trust Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::298199649603:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "YOUR_EXTERNAL_ID_FROM_STEP_1"
        }
      }
    }
  ]
}
```

### Step 7: Create Permissions Policy
1. On the "Add permissions" page:
   - **Click** the **"Create policy"** button (opens in new tab)
2. In the new tab (Policy creation):
   - **Click** the **"JSON"** tab (top of page)
   - **Select all** existing content (Ctrl+A / Cmd+A)
   - **Delete** it (Delete key)
   - **Paste** the Permissions Policy JSON you copied from PULSE (Ctrl+V / Cmd+V)
3. **Click** the **"Next"** button
4. Enter a policy name: `PULSE-CostExplorer-ReadOnly`
5. (Optional) Add description: "Allows PULSE to read cost data via Cost Explorer API"
6. **Click** the **"Create policy"** button
7. **Close** the policy creation tab
8. **Go back** to the role creation tab

**📸 Screenshot Placeholder**: AWS IAM Policy JSON editor with pasted permissions policy

**Expected Permissions Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetDimensionValues"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 8: Attach Policy to Role
1. Back on the "Add permissions" page:
   - In the **search box**, **type**: `PULSE-CostExplorer-ReadOnly`
   - **Wait** for search results
   - **Check** the checkbox next to your policy
   - **Click** the **"Next"** button (bottom right)

**📸 Screenshot Placeholder**: Add permissions page with policy selected

### Step 9: Name and Create Role
1. On the "Name, review, and create" page:
   - **Enter** role name: `PULSE-CostExplorer-Role` (or your preferred name)
   - (Optional) **Enter** description: "Allows PULSE to read cost data via Cost Explorer API"
2. **Click** the **"Create role"** button (bottom right)
3. **Wait** for role creation to complete
4. **Click** on the role name in the success message (or find it in the Roles list)

**📸 Screenshot Placeholder**: Role creation success page

### Step 10: Copy Role ARN
1. On the role details page:
   - Find the **"Role ARN"** field (near the top)
   - **Click** the **copy icon** (📋) next to the Role ARN
   - The Role ARN is now in your clipboard
   - **Example**: `arn:aws:iam::123456789012:role/PULSE-CostExplorer-Role`

**📸 Screenshot Placeholder**: Role details page with Role ARN highlighted and copy icon

---

## Part 3: Back in PULSE (1 minute)

### Step 11: Enter Connection Details
1. **Go back** to the PULSE tab
2. **Scroll** to **Step 3: Connect in PULSE**
3. Fill in the form:
   - **Account Name** field: **Type** a friendly name (e.g., "Production AWS Account")
   - **Role ARN** field: **Paste** the Role ARN you copied from AWS (Ctrl+V / Cmd+V)

**📸 Screenshot Placeholder**: Step 3 form with Account Name and Role ARN filled in

### Step 12: Test Connection
1. **Click** the **"Test Connection"** button (blue button)
2. **Wait** 10-30 seconds for the test to complete
3. You should see one of these results:
   - **✓ Success**: Green box with "Connection successful! Found X cost records."
   - **✗ Error**: Red box with error message

**📸 Screenshot Placeholder**: Test Connection button with success message

**If Error:**
- Check Role ARN is correct (copy-paste again)
- Verify External ID in AWS Trust Policy matches PULSE Step 1
- Ensure Permissions Policy is attached to the role
- Check Trust Policy Principal ARN is `arn:aws:iam::298199649603:root`

### Step 13: Save Connection
1. **Only if test succeeded**, the **"Save Connection"** button will be enabled (green button)
2. **Click** the **"Save Connection"** button
3. **Wait** for save to complete
4. You'll be **automatically redirected** to the Cloud Accounts page

**📸 Screenshot Placeholder**: Save Connection button enabled after successful test

---

## Part 4: Verify Connection

### Step 14: View Cloud Account
1. On the Cloud Accounts page, you should see your AWS account listed
2. Check the details:
   - **Account Name**: Your entered name
   - **Status**: Should be "ACTIVE" (green badge)
   - **Provider**: AWS
   - **Connection Type**: COST_EXPLORER
   - **Last synced**: "Just now" or timestamp
   - **Role ARN**: Your role ARN (displayed)

**📸 Screenshot Placeholder**: Cloud Accounts page showing connected AWS account

### Step 15: Test Manual Sync (Optional)
1. On the Cloud Accounts page, find your AWS account
2. **Click** the **"Sync Now"** button (blue button, top right of account card)
3. **Wait** 10-30 seconds
4. The "Last synced" timestamp should update

**Note**: Manual sync is rate-limited to once per 15 minutes per organization.

**📸 Screenshot Placeholder**: Sync Now button with updated "Last synced" timestamp

---

## Troubleshooting

### Trust Policy Errors

**Error: "Invalid Principal"**
- Verify Principal ARN is exactly: `arn:aws:iam::298199649603:root`
- Do not use `*` or any other value
- Copy-paste the Trust Policy from PULSE exactly

**Error: "External ID mismatch"**
- Verify External ID in AWS Trust Policy matches the one from PULSE Step 1
- Copy-paste the External ID exactly (no extra spaces)

### Connection Test Errors

**Error: "Access denied"**
- Check Role ARN is correct (copy-paste again)
- Verify External ID matches
- Ensure Permissions Policy is attached to the role
- Verify Trust Policy Principal is `arn:aws:iam::298199649603:root`

**Error: "Role not found"**
- Verify Role ARN format: `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME`
- Ensure role exists in the correct AWS account
- Check for typos in Role ARN

**Error: "No cost data returned"**
- Cost data may take 24-48 hours to appear in Cost Explorer
- Verify your AWS account has active services with costs
- Check that billing is enabled

### Sync Errors

**Error: "Rate limit exceeded"**
- Wait 15 minutes between manual syncs
- Automatic daily sync is not rate-limited

**Error: "Sync failed"**
- Check "Last error" message on Cloud Accounts page
- Verify Role ARN and External ID are still correct
- Ensure IAM role permissions haven't changed

---

## Quick Checklist

- [ ] External ID copied from PULSE Step 1
- [ ] Trust Policy JSON copied from PULSE Step 2.2
- [ ] Permissions Policy JSON copied from PULSE Step 2.3
- [ ] IAM Role created in AWS with correct Trust Policy
- [ ] Permissions Policy created and attached to role
- [ ] Role ARN copied from AWS
- [ ] Connection tested successfully in PULSE
- [ ] Connection saved in PULSE
- [ ] Cloud account appears with "ACTIVE" status

---

## Security Confirmation

✅ **Principal ARN**: Always `arn:aws:iam::298199649603:root` (never `*`)
✅ **External ID**: Unique UUID generated per connection
✅ **Permissions**: Minimal (only Cost Explorer read-only)
✅ **Rate Limiting**: 15 minutes between manual syncs

---

**Final URL**: `/organizations/[id]/cloud-accounts/connect/aws`

**Status**: ✅ **AWS CONNECT WIZARD READY FOR PRODUCTION**

