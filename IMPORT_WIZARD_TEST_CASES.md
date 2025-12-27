# Import Wizard - Test Cases

## Overview
The Import Wizard is a 3-step process:
1. **Upload CSV** - Select and parse CSV file
2. **Map Columns** - Auto-detect and manually map CSV columns to required fields
3. **Preview & Import** - Validate data, show preview, and import

## Test Cases

### ✅ Test Case 1: Good CSV (Standard Format)
**File**: `good-csv.csv`
```csv
date,provider,service,amountEUR,currency
2024-01-15,AWS,EC2,150.50,EUR
2024-01-16,GCP,Compute Engine,200.75,USD
2024-01-17,Azure,Virtual Machines,175.25,EUR
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ✅ Step 2: All columns auto-detected correctly
- ✅ Step 3: Preview shows 3 valid rows, total amount displayed
- ✅ Import succeeds with 3 records imported, 0 rejected
- ✅ Dashboard shows imported data

**Validation**:
- Date format: YYYY-MM-DD ✓
- Provider: AWS/GCP/Azure ✓
- Service: Non-empty ✓
- Amount: Positive number ✓
- Currency: EUR/USD ✓

---

### ❌ Test Case 2: Missing Required Columns
**File**: `missing-columns.csv`
```csv
date,service,amountEUR
2024-01-15,EC2,150.50
2024-01-16,Compute Engine,200.75
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ⚠️ Step 2: Auto-detection finds `date`, `service`, `amountEUR` but missing:
  - `provider` column (or default provider not selected)
  - `currency` column
- ⚠️ Validation errors shown:
  - "Provider column is required" (if no default provider selected)
  - "Currency column is required"
- ❌ Cannot proceed to Step 3 until all required columns mapped

**Actionable Error Messages**:
```
Missing Required Columns:
• Provider column is required (or select a default provider)
• Currency column is required
```

**Fix**: User must either:
1. Select a default provider from dropdown
2. Map a provider column if it exists with different name
3. Add currency column to CSV or map existing column

---

### ❌ Test Case 3: Wrong Date Format
**File**: `wrong-date-format.csv`
```csv
date,provider,service,amountEUR,currency
01/15/2024,AWS,EC2,150.50,EUR
2024-01-16,GCP,Compute Engine,200.75,USD
15-01-2024,Azure,Virtual Machines,175.25,EUR
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ✅ Step 2: Columns mapped correctly
- ⚠️ Step 3: Preview shows validation errors:
  - Row 1: "Invalid date format (expected YYYY-MM-DD, got: 01/15/2024)"
  - Row 2: ✓ Valid
  - Row 3: "Invalid date format (expected YYYY-MM-DD, got: 15-01-2024)"

**Preview Table**:
| Row | Date | Provider | Service | Amount | Status |
|-----|------|----------|---------|--------|--------|
| 1 | - | AWS | EC2 | 150.50 EUR | ⚠️ 1 error(s) |
| 2 | 2024-01-16 | GCP | Compute Engine | 200.75 USD | ✓ Valid |
| 3 | - | Azure | Virtual Machines | 175.25 EUR | ⚠️ 1 error(s) |

**Actionable Error Messages**:
- Row 1: "Invalid date format (expected YYYY-MM-DD, got: 01/15/2024)"
- Row 3: "Invalid date format (expected YYYY-MM-DD, got: 15-01-2024)"

**Import Result**:
- ✅ 1 record imported (row 2)
- ❌ 2 records rejected
- Sample rejections:
  - Line 2: Invalid date format (expected YYYY-MM-DD, got: 01/15/2024)
  - Line 4: Invalid date format (expected YYYY-MM-DD, got: 15-01-2024)

**Fix**: User must reformat dates in CSV to YYYY-MM-DD format

---

### ❌ Test Case 4: Invalid Provider Values
**File**: `invalid-provider.csv`
```csv
date,provider,service,amountEUR,currency
2024-01-15,Amazon,AWS Service,150.50,EUR
2024-01-16,Google Cloud,GCP Service,200.75,USD
2024-01-17,Microsoft,Azure Service,175.25,EUR
2024-01-18,InvalidProvider,Service,100.00,EUR
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ✅ Step 2: Columns mapped
- ⚠️ Step 3: Preview shows validation:
  - Row 1: Provider "Amazon" → Auto-normalized to "AWS" (if contains "AWS")
  - Row 2: Provider "Google Cloud" → Auto-normalized to "GCP" (if contains "GCP")
  - Row 3: Provider "Microsoft" → Auto-normalized to "Azure" (if contains "Azure")
  - Row 4: Provider "InvalidProvider" → Error: "Invalid provider (expected AWS/GCP/Azure/Other, got: InvalidProvider)"

**Actionable Error Messages**:
- Row 4: "Invalid provider (expected AWS/GCP/Azure/Other, got: InvalidProvider)"

**Fix**: User must:
1. Change "InvalidProvider" to one of: AWS, GCP, Azure, Other
2. Or select default provider if provider column not needed

---

### ❌ Test Case 5: Invalid Amount Values
**File**: `invalid-amount.csv`
```csv
date,provider,service,amountEUR,currency
2024-01-15,AWS,EC2,150.50,EUR
2024-01-16,GCP,Compute Engine,not-a-number,USD
2024-01-17,Azure,Virtual Machines,-50.00,EUR
2024-01-18,AWS,S3,,EUR
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ✅ Step 2: Columns mapped
- ⚠️ Step 3: Preview shows validation errors:
  - Row 1: ✓ Valid
  - Row 2: "Invalid amount (expected positive number, got: not-a-number)"
  - Row 3: "Invalid amount (expected positive number, got: -50.00)"
  - Row 4: "Invalid amount (expected positive number, got: empty)"

**Actionable Error Messages**:
- Row 2: "Invalid amount (expected positive number, got: not-a-number)"
- Row 3: "Invalid amount (expected positive number, got: -50.00)"
- Row 4: "Invalid amount (expected positive number, got: empty)"

**Fix**: User must ensure all amounts are:
- Valid numbers (not text)
- Positive (>= 0)
- Non-empty

---

### ❌ Test Case 6: Missing Service Names
**File**: `missing-service.csv`
```csv
date,provider,service,amountEUR,currency
2024-01-15,AWS,,150.50,EUR
2024-01-16,GCP,Compute Engine,200.75,USD
2024-01-17,Azure,  ,175.25,EUR
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ✅ Step 2: Columns mapped
- ⚠️ Step 3: Preview shows validation errors:
  - Row 1: "Service name is required"
  - Row 2: ✓ Valid
  - Row 3: "Service name is required" (whitespace-only treated as empty)

**Actionable Error Messages**:
- Row 1: "Service name is required"
- Row 3: "Service name is required"

**Fix**: User must ensure all service names are non-empty

---

### ✅ Test Case 7: Auto-Detection with Different Column Names
**File**: `different-column-names.csv`
```csv
Usage Date,Cloud Provider,Service Name,Cost EUR,Billing Currency
2024-01-15,AWS,EC2,150.50,EUR
2024-01-16,GCP,Compute Engine,200.75,USD
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ✅ Step 2: Auto-detection finds:
  - "Usage Date" → mapped to `date` ✓
  - "Cloud Provider" → mapped to `provider` ✓
  - "Service Name" → mapped to `service` ✓
  - "Cost EUR" → mapped to `amountEUR` ✓
  - "Billing Currency" → mapped to `currency` ✓
- ✅ Step 3: Preview shows valid rows
- ✅ Import succeeds

**Auto-Detection Logic**:
- `date`: Matches "date", "usage date", "billing date", "period"
- `provider`: Matches "provider", "cloud provider", "platform", "vendor"
- `service`: Matches "service", "service name", "product", "sku"
- `amountEUR`: Matches "amounteur", "cost", "cost eur", "unblended cost"
- `currency`: Matches "currency", "currency code", "billing currency"

---

### ✅ Test Case 8: Provider Not in CSV (Default Provider Selected)
**File**: `no-provider-column.csv`
```csv
date,service,amountEUR,currency
2024-01-15,EC2,150.50,EUR
2024-01-16,Compute Engine,200.75,USD
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ⚠️ Step 2: Auto-detection finds `date`, `service`, `amountEUR`, `currency` but no `provider`
- ✅ User selects "AWS" as default provider
- ✅ Step 3: Preview shows all rows with provider = "AWS"
- ✅ Import succeeds with provider = "AWS" for all rows

**User Action**: Select default provider from dropdown in Step 2

---

### ❌ Test Case 9: Mixed Valid and Invalid Rows
**File**: `mixed-valid-invalid.csv`
```csv
date,provider,service,amountEUR,currency
2024-01-15,AWS,EC2,150.50,EUR
2024-01-16,GCP,Compute Engine,invalid,USD
2024-01-17,Azure,Virtual Machines,175.25,EUR
2024-01-32,AWS,S3,100.00,EUR
2024-01-18,GCP,Cloud Storage,200.75,USD
```

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ✅ Step 2: Columns mapped
- ⚠️ Step 3: Preview shows:
  - Row 1: ✓ Valid
  - Row 2: "Invalid amount (expected positive number, got: invalid)"
  - Row 3: ✓ Valid
  - Row 4: "Invalid date format (expected YYYY-MM-DD, got: 2024-01-32)" (invalid day)
  - Row 5: ✓ Valid

**Import Result**:
- ✅ 3 records imported (rows 1, 3, 5)
- ❌ 2 records rejected (rows 2, 4)
- Sample rejections:
  - Line 3: Invalid amount (expected positive number, got: invalid)
  - Line 5: Invalid date format (expected YYYY-MM-DD, got: 2024-01-32)

**User Experience**:
- Warning banner: "Some rows have validation errors and will be skipped during import."
- Import button enabled (can import valid rows)
- Clear indication of which rows will be imported vs rejected

---

### ✅ Test Case 10: Large CSV (100+ Rows)
**File**: `large-csv.csv` (100 rows)

**Expected Behavior**:
- ✅ Step 1: File uploads successfully
- ✅ Step 2: Columns mapped
- ✅ Step 3: Preview shows first 20 rows with note: "Showing first 20 rows. Full import will process all rows."
- ✅ Import processes all 100 rows
- ✅ Result shows: "Imported: 100 records, Rejected: 0 records"

**Performance**:
- Preview limited to 20 rows for performance
- Full import processes all rows
- Progress indicator during import

---

## Error Message Format

All error messages follow this format:
```
[Field]: [Specific issue] (expected [format], got: [actual value])
```

Examples:
- `Invalid date format (expected YYYY-MM-DD, got: 01/15/2024)`
- `Invalid provider (expected AWS/GCP/Azure/Other, got: Amazon)`
- `Invalid amount (expected positive number, got: -50.00)`
- `Service name is required`
- `Currency column is required`

## Validation Rules Summary

| Field | Required | Format | Valid Values |
|-------|----------|--------|---------------|
| `date` | ✅ Yes | YYYY-MM-DD | Any valid date string |
| `provider` | ⚠️ Conditional* | String | AWS, GCP, Azure, Other |
| `service` | ✅ Yes | String | Non-empty string |
| `amountEUR` | ✅ Yes | Number | Positive number (> 0) |
| `currency` | ✅ Yes | String | EUR, USD |

*Provider is required unless a default provider is selected in Step 2.

## Test Execution Steps

1. **Prepare test CSV files** using the examples above
2. **Navigate to** `/import`
3. **Upload CSV** in Step 1
4. **Verify auto-detection** in Step 2 (or manually map columns)
5. **Review preview** in Step 3
6. **Check error messages** are actionable and specific
7. **Import** and verify results
8. **Check dashboard** to confirm imported data

## Success Criteria

✅ All test cases pass
✅ Error messages are clear and actionable
✅ Auto-detection works for common column name variations
✅ Preview shows accurate validation status
✅ Import succeeds for valid rows, rejects invalid rows
✅ User can fix errors and re-import



