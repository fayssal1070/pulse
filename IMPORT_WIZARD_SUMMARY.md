# Import Wizard - Summary

## Overview
The Import Wizard has been upgraded from a simple file upload to a comprehensive 3-step wizard with column mapping, validation, and preview capabilities.

## Features Implemented

### 1. Provider Selection
- **Default Provider Dropdown**: Users can select a default provider (AWS, GCP, Azure, Other) if their CSV doesn't include a provider column
- **Location**: Step 2 (Column Mapping)
- **Use Case**: When CSV exports from cloud providers don't include provider information (since it's implicit)

### 2. Auto-Detection of Common Column Names
- **Intelligent Matching**: Automatically detects common column name variations:
  - `date`: "date", "usage date", "billing date", "period", "day", "timestamp"
  - `provider`: "provider", "cloud provider", "platform", "vendor"
  - `service`: "service", "service name", "product", "sku", "meter category"
  - `amountEUR`: "amounteur", "cost", "cost eur", "unblended cost", "amount"
  - `currency`: "currency", "currency code", "billing currency"
- **Location**: Step 2 (Column Mapping)
- **Behavior**: Pre-fills dropdowns with detected columns, user can override

### 3. Manual Column Mapping
- **Flexible Mapping**: Users can manually map any CSV column to required fields
- **Required Fields**: date, service, amountEUR, currency (provider optional if default selected)
- **Location**: Step 2 (Column Mapping)
- **Validation**: Shows errors if required columns are not mapped

### 4. Preview Rows and Totals
- **Preview Table**: Shows first 20 rows with mapped data
- **Validation Status**: Each row shows ✓ Valid or ⚠️ X error(s)
- **Total Amount**: Displays sum of all valid amounts in preview
- **Error Details**: Hover/tooltip shows specific validation errors per row
- **Location**: Step 3 (Preview & Import)

### 5. Actionable Error Messages
- **Specific Errors**: Each validation error includes:
  - Field name
  - Expected format/value
  - Actual value received
  - Clear fix instructions
- **Examples**:
  - `Invalid date format (expected YYYY-MM-DD, got: 01/15/2024)`
  - `Invalid amount (expected positive number, got: -50.00)`
  - `Service name is required`
  - `Missing required column: currency`

## Wizard Flow

### Step 1: Upload CSV
- File input with drag-and-drop support
- Quick links to download template and sample CSV
- Link to help documentation
- Validates CSV has at least header + 1 row

### Step 2: Map Columns
- **Provider Selection**: Default provider dropdown (if no provider column)
- **Column Mapping**: Dropdowns for each required field:
  - Date (required)
  - Provider (optional if default selected)
  - Service (required)
  - Amount EUR (required)
  - Currency (required)
- **Auto-Detection**: Pre-fills mappings based on column name matching
- **Validation**: Shows errors if required columns not mapped
- **Navigation**: Back to Step 1, Forward to Step 3

### Step 3: Preview & Import
- **Preview Table**: First 20 rows with mapped values
- **Total Amount**: Sum of valid amounts
- **Validation Status**: Per-row validation with error details
- **Warning Banner**: If any rows have errors
- **Import Button**: Enabled if at least one valid row exists
- **Navigation**: Back to Step 2, Import to complete

## Validation Rules

| Field | Required | Format | Valid Values |
|-------|----------|--------|---------------|
| `date` | ✅ Yes | YYYY-MM-DD | Valid date string |
| `provider` | ⚠️ Conditional* | String | AWS, GCP, Azure, Other |
| `service` | ✅ Yes | String | Non-empty string |
| `amountEUR` | ✅ Yes | Number | Positive number (> 0) |
| `currency` | ✅ Yes | String | EUR, USD |

*Provider is required unless a default provider is selected in Step 2.

## Error Handling

### Missing Columns
- **Error**: Lists all missing required columns
- **Action**: User must map columns or select default provider
- **Location**: Step 2 validation

### Invalid Data
- **Error**: Per-row validation errors shown in preview
- **Action**: User can see which rows will be rejected before import
- **Location**: Step 3 preview table

### Import Results
- **Success**: Shows imported count
- **Rejected**: Shows rejected count with sample reasons
- **Action**: User can fix CSV and re-import

## Files Created/Modified

1. ✅ `components/import-wizard.tsx` - **NEW** - Complete wizard component
2. ✅ `app/import/page.tsx` - **MODIFIED** - Replaced simple form with wizard
3. ✅ `app/api/active-org/route.ts` - **MODIFIED** - Added GET endpoint to fetch active org
4. ✅ `IMPORT_WIZARD_TEST_CASES.md` - **NEW** - Comprehensive test cases
5. ✅ `IMPORT_WIZARD_SUMMARY.md` - **NEW** - This document

## User Experience Improvements

### Before
- Simple file upload
- Required exact column names
- No preview before import
- Generic error messages
- All-or-nothing import

### After
- 3-step guided wizard
- Auto-detects common column names
- Preview with validation before import
- Specific, actionable error messages
- Partial import (valid rows imported, invalid rejected)

## Test Cases

See `IMPORT_WIZARD_TEST_CASES.md` for comprehensive test scenarios including:
- ✅ Good CSV (standard format)
- ❌ Missing required columns
- ❌ Wrong date format
- ❌ Invalid provider values
- ❌ Invalid amount values
- ❌ Missing service names
- ✅ Auto-detection with different column names
- ✅ Provider not in CSV (default selected)
- ❌ Mixed valid and invalid rows
- ✅ Large CSV (100+ rows)

## Technical Details

### CSV Parsing
- Handles quoted values (e.g., `"Service Name, Inc."`)
- Handles escaped quotes (e.g., `"Service ""Pro"" Name"`)
- Trims whitespace from values
- Skips empty lines

### Column Detection
- Case-insensitive matching
- Partial matching (e.g., "usage date" matches "date")
- First match wins (if multiple columns match)

### Validation
- Client-side validation in preview (Step 3)
- Server-side validation in import API
- Consistent error messages between client and server

### Performance
- Preview limited to 20 rows for performance
- Full import processes all rows
- Progress indicator during import

## Next Steps (Optional Enhancements)

- [ ] Drag-and-drop file upload
- [ ] CSV export of rejected rows
- [ ] Batch import from multiple files
- [ ] Column type detection (date, number, etc.)
- [ ] Data transformation rules (currency conversion, date format conversion)
- [ ] Import history/logs

---

**Status**: ✅ **IMPORT WIZARD COMPLETE**

**Key Features**:
- ✅ Provider selection
- ✅ Auto-detection of common column names
- ✅ Manual column mapping
- ✅ Preview rows and totals
- ✅ Actionable error messages
- ✅ Comprehensive test cases

