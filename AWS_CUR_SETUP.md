# AWS Cost and Usage Report (CUR) Setup Guide

## Overview

Pulse ingests AWS costs from Cost and Usage Reports (CUR) stored in S3. This provides the most accurate and detailed cost data, including resource-level attribution and tags.

## Prerequisites

1. AWS account with billing access
2. S3 bucket for CUR exports
3. IAM permissions to read CUR files from S3

## Step 1: Enable CUR in AWS

1. Go to [AWS Billing Console](https://console.aws.amazon.com/billing/home#/reports)
2. Click "Cost and Usage Reports" → "Create report"
3. Configure report:
   - **Report name**: `pulse-cost-report` (or your choice)
   - **Time unit**: Daily
   - **Report versioning**: Overwrite existing report
   - **Data refresh settings**: Automatic
   - **Report data integration**: None (or Athena if you want)
4. **Additional report details**:
   - ✅ Include resource IDs
   - ✅ Include resource tags
   - ✅ Automatically refresh your Cost and Usage Reports when charges are detected for previous months with closed bills
5. **S3 bucket**:
   - Create or select an S3 bucket (e.g., `pulse-cur-exports`)
   - **Report path prefix**: `cur/` (or your choice)
   - **Compression**: GZIP
   - **Report format**: CSV
6. Click "Next" → Review → "Create report"

## Step 2: Configure S3 Bucket Permissions

The CUR service needs write access. AWS automatically configures this, but verify:

1. Go to S3 → Your bucket → Permissions
2. Bucket policy should allow `billingreports.amazonaws.com` to write
3. If missing, add:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCURService",
      "Effect": "Allow",
      "Principal": {
        "Service": "billingreports.amazonaws.com"
      },
      "Action": [
        "s3:GetBucketAcl",
        "s3:GetBucketPolicy"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    },
    {
      "Sid": "AllowCURServicePutObject",
      "Effect": "Allow",
      "Principal": {
        "Service": "billingreports.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/cur/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": "bucket-owner-full-control"
        }
      }
    }
  ]
}
```

## Step 3: Configure IAM Role for Pulse to Read CUR

Pulse needs read access to the S3 bucket. Two options:

### Option A: IAM Role (Recommended for Production)

1. Create IAM role in your AWS account:
   - Trust policy: Allow Pulse AWS account to assume role
   - Permissions: `s3:GetObject`, `s3:ListBucket` on CUR bucket/prefix
2. In Pulse UI:
   - Go to Organization Settings
   - Enable "AWS CUR"
   - Enter:
     - **Bucket**: `your-cur-bucket`
     - **Prefix**: `cur/`
     - **Region**: `us-east-1` (or your bucket region)
     - **Assume Role ARN**: `arn:aws:iam::YOUR-ACCOUNT-ID:role/PulseCurReader`

### Option B: Access Keys (Development/Testing)

1. Create IAM user with `s3:GetObject` and `s3:ListBucket` permissions
2. Generate access keys
3. Set environment variables in Pulse:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

## Step 4: Tag Mapping (Team/Project Attribution)

To attribute costs to teams/projects, tag your AWS resources:

- **Tag Key**: `Project` → Maps to `dimensions.projectId` in CostEvent
- **Tag Key**: `Team` → Maps to `dimensions.teamId` in CostEvent
- **Tag Key**: `User` → Maps to `dimensions.userId` in CostEvent
- **Tag Key**: `App` → Maps to `dimensions.appId` in CostEvent
- **Tag Key**: `Client` → Maps to `dimensions.clientId` in CostEvent

### Example: Tag EC2 Instance

```bash
aws ec2 create-tags \
  --resources i-1234567890abcdef0 \
  --tags Key=Project,Value=web-app Key=Team,Value=engineering
```

## Step 5: Enable CUR in Pulse

1. Go to `/accounts` or Organization Settings
2. Enable "AWS CUR"
3. Enter:
   - **Bucket**: Your CUR S3 bucket name
   - **Prefix**: Path prefix (e.g., `cur/`)
   - **Region**: S3 bucket region
   - **Payer Account ID**: Your AWS account ID (optional, for multi-account)
   - **Assume Role ARN**: If using cross-account role (optional)
4. Click "Save"
5. Click "Sync CUR Now" to trigger first sync

## Step 6: Verify Sync

1. Go to `/accounts` → Check "AWS CUR Sync Status"
2. View last batch:
   - Batch ID
   - Status (running/completed/failed)
   - Events upserted
   - Errors (if any)
3. Go to `/dashboard` → Verify AWS costs appear in KPIs

## Troubleshooting

### No files found in S3

- Verify CUR is enabled and generating reports (takes 24-48h for first report)
- Check S3 bucket path prefix matches CUR configuration
- Verify IAM permissions allow `s3:ListBucket` and `s3:GetObject`

### Sync fails with "Access Denied"

- Verify IAM role/user has correct permissions
- Check bucket policy allows read access
- If using assume role, verify trust policy allows Pulse AWS account

### Costs not appearing

- Wait 24-48h after enabling CUR (AWS generates reports daily)
- Check `/api/aws/cur/status` for last sync status
- Verify CostEvents are created: Check database or `/costs` page

### Tag mapping not working

- Ensure tags are included in CUR (enable "Include resource tags" in CUR config)
- Tag keys must match exactly: `Project`, `Team`, `User`, `App`, `Client` (case-sensitive)
- Tags must be applied to resources before costs are incurred

## CUR File Format

CUR files are CSV (GZIP compressed) with columns:
- `identity/LineItemId` - Unique line item ID
- `lineItem/UsageStartDate` - Date of usage
- `lineItem/UnblendedCost` - Cost amount
- `lineItem/CurrencyCode` - Currency (usually USD)
- `lineItem/ProductName` - Service name
- `lineItem/ResourceId` - Resource ARN/ID
- `resourceTags/user:Project` - Project tag value
- `resourceTags/user:Team` - Team tag value
- ... (many more columns)

## Multi-Account Setup

For organizations with multiple AWS accounts:

1. Enable CUR in each account (or use consolidated billing)
2. Configure cross-account IAM role:
   - Create role in each account with S3 read permissions
   - Trust Pulse AWS account
   - Use External ID for security
3. In Pulse: Configure `awsAssumeRoleArn` per account or org-level

## Cost Attribution Best Practices

1. **Tag early**: Apply tags when creating resources
2. **Tag consistently**: Use same tag keys across all resources
3. **Tag comprehensively**: Tag all cost-generating resources (EC2, S3, RDS, Lambda, etc.)
4. **Review regularly**: Check `/costs` to verify attribution

## Next Steps

- Set up budgets based on CostEvents
- Create alerts for cost spikes
- Use AI Gateway to track AI costs alongside AWS costs

