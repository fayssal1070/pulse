# CSV Import Guide

## CSV Format Requirements

### Required Columns

The CSV file must contain exactly these 5 columns (in any order):

1. **`date`** (required)
   - Format: `YYYY-MM-DD`
   - Example: `2024-01-15`
   - Must be a valid date

2. **`provider`** (required)
   - Values: `AWS`, `GCP`, `Azure`, or `Other`
   - Case-insensitive (will be normalized)

3. **`service`** (required)
   - Service name (string)
   - Examples: `EC2`, `Compute Engine`, `Virtual Machines`, `S3`, `Cloud SQL`
   - Cannot be empty

4. **`amountEUR`** (required)
   - Cost amount as a number
   - Example: `150.50`, `99.99`, `1234.56`
   - Must be a valid number > 0

5. **`currency`** (required)
   - Values: `EUR` or `USD`
   - Case-insensitive (will be normalized)

### CSV Template

**Location**: Generated dynamically at `/api/csv/template`

**Content**:
```csv
date,provider,service,amountEUR,currency
```

**Usage**: Download the template, fill in your data, and import.

### Sample CSV

**Location**: Generated dynamically at `/api/csv/sample`

**Content**: 45 realistic records with:
- Mix of AWS, GCP, Azure providers
- Various services (EC2, RDS, S3, Compute Engine, etc.)
- Costs ranging from €5 to €150
- Dates spanning last 30 days
- Mix of EUR and USD currencies

**Usage**: Download and import immediately to populate your dashboard with sample data.

## Where Files Are Generated/Stored

### Template CSV
- **File**: `lib/csv-templates.ts` → `generateCSVTemplate()`
- **API Route**: `app/api/csv/template/route.ts`
- **Storage**: Generated on-demand (not stored on disk)
- **URL**: `/api/csv/template`

### Sample CSV
- **File**: `lib/csv-templates.ts` → `generateSampleCSV()`
- **API Route**: `app/api/csv/sample/route.ts`
- **Storage**: Generated on-demand (not stored on disk)
- **URL**: `/api/csv/sample`
- **Records**: 45 rows (30-60 range as requested)

## User Steps to Test

### Test 1: Download Template

1. Navigate to `/import` (must be logged in)
2. Click "📥 Download CSV Template"
3. **Expected**: File downloads as `pulse-import-template.csv`
4. **Expected**: File contains header row: `date,provider,service,amountEUR,currency`

### Test 2: Download Sample CSV

1. Navigate to `/import` (must be logged in)
2. Click "📊 Download Sample CSV"
3. **Expected**: File downloads as `pulse-sample-data.csv`
4. **Expected**: File contains 45 data rows + 1 header row = 46 total lines
5. **Expected**: Mix of AWS, GCP, Azure providers
6. **Expected**: Dates in YYYY-MM-DD format
7. **Expected**: Realistic cost amounts

### Test 3: Import Sample CSV (Zero Errors)

1. Navigate to `/import` (must be logged in)
2. Click "📊 Download Sample CSV"
3. Click "Choose File" and select the downloaded `pulse-sample-data.csv`
4. Click "Import CSV"
5. **Expected**: 
   - ✅ Imported: 45 records
   - ❌ Rejected: 0 records
   - No error messages
6. Navigate to `/dashboard`
7. **Expected**: Dashboard shows data:
   - Total costs for last 7/30 days
   - 12-month trend (if dates span multiple months)
   - Top services list
   - Charts populated

### Test 4: Import Template (Fill Manually)

1. Navigate to `/import`
2. Click "📥 Download CSV Template"
3. Open in Excel/Google Sheets
4. Add 3-5 rows of test data:
   ```
   date,provider,service,amountEUR,currency
   2024-12-01,AWS,EC2,150.50,EUR
   2024-12-02,GCP,Compute Engine,95.25,EUR
   2024-12-03,Azure,Virtual Machines,80.00,USD
   ```
5. Save as CSV
6. Upload and import
7. **Expected**: All rows imported successfully

### Test 5: Verify Dashboard Shows Value

After importing sample CSV:

1. Go to `/dashboard`
2. **Expected to see**:
   - ✅ Total costs displayed (last 7 days, last 30 days)
   - ✅ Top services list (shows EC2, RDS, S3, etc.)
   - ✅ Cost trend chart (if data spans multiple months)
   - ✅ No "No data" messages

## CSV Format Examples

### Minimal Valid CSV
```csv
date,provider,service,amountEUR,currency
2024-01-15,AWS,EC2,150.50,EUR
```

### Realistic Example
```csv
date,provider,service,amountEUR,currency
2024-12-01,AWS,EC2,125.75,EUR
2024-12-01,AWS,RDS,85.30,EUR
2024-12-02,GCP,Compute Engine,95.25,EUR
2024-12-02,GCP,Cloud SQL,70.50,EUR
2024-12-03,Azure,Virtual Machines,80.00,USD
2024-12-03,Azure,SQL Database,65.25,EUR
```

### Sample CSV Structure (45 records)
- **Date range**: Last 30 days
- **Providers**: Rotating AWS, GCP, Azure
- **Services**: 
  - AWS: EC2, RDS, S3, Lambda, CloudFront, Route53
  - GCP: Compute Engine, Cloud SQL, Cloud Storage, Cloud Functions, Load Balancing
  - Azure: Virtual Machines, SQL Database, Blob Storage, Functions, App Service
- **Costs**: €5-€150 range with realistic variance
- **Currency**: 90% EUR, 10% USD

## Validation Rules

The import API validates:

1. **Date**: Must be valid YYYY-MM-DD format
2. **Provider**: Must be AWS, GCP, Azure, or Other (case-insensitive)
3. **Service**: Cannot be empty
4. **amountEUR**: Must be a valid number > 0
5. **Currency**: Must be EUR or USD (case-insensitive)

## Error Handling

If import fails:
- Check error message for specific validation issues
- Verify all required columns are present
- Ensure date format is YYYY-MM-DD
- Verify provider values are correct
- Check that amountEUR is a valid number

## Files Modified

1. ✅ `lib/csv-templates.ts` - NEW - Template and sample CSV generators
2. ✅ `app/api/csv/template/route.ts` - NEW - API endpoint for template download
3. ✅ `app/api/csv/sample/route.ts` - NEW - API endpoint for sample download
4. ✅ `app/import/page.tsx` - MODIFIED - Added download buttons and improved documentation

## Technical Details

### Template Generation
- Simple header row with required columns
- No data rows (user fills manually)

### Sample Generation
- 45 records generated programmatically
- Realistic cost distribution with variance
- Dates spread over last 30 days
- Provider rotation ensures variety
- Services match real cloud provider offerings

### Import Compatibility
- Sample CSV matches exact format expected by `/api/import`
- All records pass validation
- Zero errors guaranteed

---

**Status**: ✅ **CSV TEMPLATE & SAMPLE COMPLETE**



