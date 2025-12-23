# AWS Connect Wizard - User Guide

## Overview
This guide provides step-by-step instructions for connecting an AWS account to PULSE using the Connect AWS wizard. The entire process takes about 5 minutes.

## Prerequisites
- AWS account with IAM permissions to create roles and policies
- Access to AWS IAM Console
- PULSE account with an organization created

---

## Step-by-Step Instructions

### Part 1: In PULSE

#### Step 1.1: Navigate to Connect AWS
1. Log in to PULSE
2. Go to your organization page (click organization name in dashboard)
3. Click **"Cloud Accounts"** button in the top right
4. Click **"+ Connect AWS"** button
5. You should see the Connect AWS wizard page

**📸 Screenshot Placeholder**: PULSE organization page → Cloud Accounts button → Connect AWS page

#### Step 1.2: Copy External ID
1. On the Connect AWS page, you'll see **Step 1: Generate External ID**
2. A UUID is automatically generated (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
3. Click the **"Copy"** button next to the External ID
4. **Keep this page open** - you'll need the External ID in the next steps

**📸 Screenshot Placeholder**: Step 1 showing External ID with Copy button

---

### Part 2: In AWS Console

#### Step 2.1: Open AWS IAM Console
1. Open a new browser tab
2. Go to [AWS IAM Console](https://console.aws.amazon.com/iam)
3. Sign in with your AWS account
4. In the left navigation, click **"Roles"**
5. Click the **"Create role"** button (top right)

**📸 Screenshot Placeholder**: AWS IAM Console → Roles → Create role button

#### Step 2.2: Configure Trust Policy
1. On the "Select trusted entity" page:
   - Select **"Custom trust policy"** (not AWS service)
   - Click **"Edit"** to open the JSON editor
2. In the JSON editor:
   - Delete all existing content
   - Go back to PULSE tab
   - In **Step 2.2**, find the **Trust Policy JSON** box
   - Click **"Copy JSON"** button
   - Go back to AWS tab
   - Paste the JSON into the editor
3. **Important**: The Trust Policy is pre-configured with PULSE's dedicated AWS account (`arn:aws:iam::298199649603:root`). Do not modify the Principal ARN.
4. Click **"Next"** button

**📸 Screenshot Placeholder**: AWS IAM Trust Policy editor with pasted JSON

**Example Trust Policy** (after replacing account ID):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        }
      }
    }
  ]
}
```

#### Step 2.3: Create Permissions Policy
1. On the "Add permissions" page:
   - Click **"Create policy"** button (opens in new tab)
2. In the new tab (Policy creation):
   - Click the **"JSON"** tab
   - Go back to PULSE tab
   - In **Step 2.3**, find the **Permissions Policy JSON** box
   - Click **"Copy JSON"** button
   - Go back to AWS tab
   - Paste the JSON into the editor
3. Click **"Next"** button
4. Enter a policy name (e.g., `PULSE-CostExplorer-ReadOnly`)
5. Click **"Create policy"**
6. **Close the policy creation tab** and go back to the role creation tab

**📸 Screenshot Placeholder**: AWS IAM Policy JSON editor with pasted permissions

**Example Permissions Policy**:
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

#### Step 2.4: Attach Policy and Complete Role
1. Back on the "Add permissions" page:
   - In the search box, type your policy name (e.g., `PULSE-CostExplorer-ReadOnly`)
   - Select the policy checkbox
   - Click **"Next"** button
2. On the "Name, review, and create" page:
   - Enter a role name (e.g., `PULSE-CostExplorer-Role`)
   - Add description (optional): "Allows PULSE to read cost data via Cost Explorer API"
   - Click **"Create role"** button
3. **Copy the Role ARN**:
   - After role is created, click on the role name
   - Find the **"Role ARN"** field (e.g., `arn:aws:iam::123456789012:role/PULSE-CostExplorer-Role`)
   - Click the copy icon next to it
   - **Keep this copied** - you'll need it in PULSE

**📸 Screenshot Placeholder**: AWS IAM Role created with Role ARN highlighted

---

### Part 3: Back in PULSE

#### Step 3.1: Enter Connection Details
1. Go back to PULSE tab
2. Scroll to **Step 3: Connect in PULSE**
3. Fill in the form:
   - **Account Name**: Enter a friendly name (e.g., "Production AWS Account")
   - **Role ARN**: Paste the Role ARN you copied from AWS (e.g., `arn:aws:iam::123456789012:role/PULSE-CostExplorer-Role`)

**📸 Screenshot Placeholder**: Step 3 form with Account Name and Role ARN fields

#### Step 3.2: Test Connection
1. Click the **"Test Connection"** button
2. Wait for the test to complete (10-30 seconds)
3. You should see one of these results:
   - **✓ Success**: "Connection successful! Found X cost records."
   - **✗ Error**: Error message with details

**Common Errors:**
- **"Access denied"**: Check Role ARN and External ID match
- **"Role not found"**: Verify Role ARN is correct
- **"External ID mismatch"**: Ensure External ID in Trust Policy matches the one in PULSE

**📸 Screenshot Placeholder**: Test Connection button with success/error message

#### Step 3.3: Save Connection
1. **Only after successful test**, the **"Save Connection"** button will be enabled
2. Click **"Save Connection"** button
3. You'll be redirected to the Cloud Accounts page
4. Your AWS account should appear in the list with status "ACTIVE"

**📸 Screenshot Placeholder**: Save Connection button enabled after successful test

---

## After Connection

### Viewing Cloud Accounts
1. Go to your organization page
2. Click **"Cloud Accounts"** button
3. You'll see your connected AWS account with:
   - Account name
   - Status (ACTIVE, PENDING, ERROR)
   - Last synced timestamp
   - "Sync Now" button

**📸 Screenshot Placeholder**: Cloud Accounts page showing connected AWS account

### Manual Sync
1. On the Cloud Accounts page, find your AWS account
2. Click **"Sync Now"** button
3. Wait for sync to complete (10-30 seconds)
4. The "Last synced" timestamp will update

**Note**: Manual sync is rate-limited to once per 15 minutes per organization.

### Automatic Daily Sync
- PULSE automatically syncs costs daily at 06:00 Europe/Brussels time
- No action needed - costs will appear on your dashboard automatically
- Check "Last synced" to see when the last automatic sync occurred

---

## Troubleshooting

### Trust Policy Errors

**Error: "Invalid Principal"**
- Verify Principal ARN is exactly: `arn:aws:iam::298199649603:root`
- Never use `*` or any other value (security risk)
- Contact PULSE support if you don't have the account ID

**Error: "External ID mismatch"**
- Verify the External ID in Trust Policy matches the one shown in PULSE Step 1
- Copy-paste the External ID exactly (no extra spaces)

### Connection Test Errors

**Error: "Access denied"**
- Check Role ARN is correct
- Verify External ID matches
- Ensure Permissions Policy is attached to the role
- Check Trust Policy Principal is correct

**Error: "Role not found"**
- Verify Role ARN format: `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME`
- Ensure role exists in the correct AWS account

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

## Security Notes

1. **Never use `*` as Principal**: Always use the specific PULSE AWS account ID
2. **Keep External ID secret**: Don't share it publicly
3. **Minimal permissions**: The Permissions Policy only grants read-only access to Cost Explorer
4. **Regular audits**: Review IAM role permissions periodically

---

## Quick Reference

### What You Need
- ✅ External ID (auto-generated in PULSE)
- ✅ Trust Policy JSON (copy from PULSE)
- ✅ Permissions Policy JSON (copy from PULSE)
- ✅ Role ARN (from AWS after creating role)

### Time Estimate
- Step 1 (PULSE): 1 minute
- Step 2 (AWS): 3-4 minutes
- Step 3 (PULSE): 1 minute
- **Total: ~5 minutes**

### Support
If you encounter issues:
1. Check the troubleshooting section above
2. Verify all steps were completed correctly
3. Contact PULSE support with:
   - Error message
   - Role ARN (without sensitive parts)
   - Screenshot of error (if possible)

---

**Status**: ✅ **AWS CONNECT WIZARD COMPLETE**

**Next Steps**: After connecting, costs will sync automatically daily. You can also trigger manual syncs from the Cloud Accounts page.

