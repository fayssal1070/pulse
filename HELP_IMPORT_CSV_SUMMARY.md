# Help Page: Import CSV Guide - Summary

## Final URL
**`https://pulse-sigma-eight.vercel.app/help/import-csv`**

## Page Content

### 3 Sections with Step-by-Step Instructions

#### 1. AWS (Amazon Web Services)
**2 Methods Provided:**

**Method 1: Cost Explorer Export**
- Navigate to Billing & Cost Management → Cost Explorer
- Set date range and group by Service
- Download CSV
- Column mapping instructions provided

**Method 2: Cost and Usage Reports (CUR)**
- Create report in Cost and Usage Reports
- Configure settings (hourly/daily)
- Download or access via S3
- Transformation instructions

**Caveats:**
- Column names may vary based on export method
- UI labels may differ by region/console version
- May need to rename columns or create new CSV

#### 2. GCP (Google Cloud Platform)
**Billing Export to CSV:**
- Navigate to Billing → Reports
- Select billing account and date range
- Group by Service or SKU
- Export/Download as CSV
- Column mapping instructions

**Alternative: BigQuery Export**
- Enable Billing Export to BigQuery
- Query dataset with SQL
- Export results as CSV

**Caveats:**
- Menu names may vary by billing account type
- Column headers may differ
- Look for "Export" or "Download" in Billing Reports

#### 3. Azure (Microsoft Azure)
**Cost Management Export:**
- Navigate to Cost Management + Billing → Cost Management
- Go to Cost analysis
- Configure view (subscription, date range, group by Service)
- Export/Download CSV
- Column mapping instructions

**Alternative: Usage Details API**
- Use Azure Cost Management API
- Convert to CSV format

**Caveats:**
- UI may vary by subscription type and region
- Export option may be labeled differently
- Column names may differ based on export settings

### Screenshot Placeholders
Each section includes a placeholder box indicating where screenshots should be added:
- AWS: "Cost Explorer → Download CSV button location"
- GCP: "Billing Reports → Export/Download button"
- Azure: "Cost Management → Export/Download CSV option"

### General Tips Section
- Date range recommendations (30-90 days)
- Column mapping guidance
- Currency handling (EUR/USD)
- Link to CSV template for manual mapping

## Link Placement

### 1. From `/import` Page
**Location**: In the blue help box, below the download buttons
**Text**: "📖 How to export CSV from AWS, GCP, or Azure →"
**Exact Code Location**: `app/import/page.tsx` line ~150-155

```tsx
<div className="mt-3 pt-3 border-t border-blue-200">
  <Link
    href="/help/import-csv"
    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
  >
    📖 How to export CSV from AWS, GCP, or Azure →
  </Link>
</div>
```

### 2. From Dashboard Quickstart (Setup Progress Widget)
**Location**: Next to "Add Cloud Account" step (Step 2) when not completed
**Text**: "Help →"
**Exact Code Location**: `components/setup-progress-widget.tsx` line ~65-72

```tsx
{step.num === 2 && !step.completed && (
  <Link
    href="/help/import-csv"
    className="text-xs text-blue-600 hover:text-blue-700 ml-2"
    title="How to export CSV from cloud providers"
  >
    Help →
  </Link>
)}
```

**Visibility**: Only shows when Step 2 (Add Cloud Account) is not completed

## Files Created/Modified

1. ✅ `app/help/import-csv/page.tsx` - **NEW** - Complete help page with 3 provider sections
2. ✅ `middleware.ts` - **MODIFIED** - Added `/help` to public routes
3. ✅ `app/import/page.tsx` - **MODIFIED** - Added link to help page
4. ✅ `components/setup-progress-widget.tsx` - **MODIFIED** - Added help link for Step 2

## Route Configuration

- **Public Route**: `/help/import-csv` is accessible without login
- **Middleware**: Added `/help` prefix to public routes (matches `/help/*`)

## Content Highlights

### Honest Caveats Included
- ✅ Acknowledges UI variations by region/version
- ✅ Mentions column name differences
- ✅ Provides alternative methods
- ✅ Clear mapping instructions for each provider

### Step-by-Step Format
- ✅ Numbered lists for easy following
- ✅ Specific menu paths provided
- ✅ Column mapping examples for each provider
- ✅ Tips and alternatives included

### Visual Placeholders
- ✅ Screenshot placeholders clearly marked
- ✅ Indicates exact screenshot location needed
- ✅ Easy to replace with actual screenshots later

## Testing Checklist

- [ ] Visit `/help/import-csv` (should be public, no login required)
- [ ] Verify all 3 sections (AWS, GCP, Azure) are visible
- [ ] Check that links work:
  - [ ] Link from `/import` page
  - [ ] Link from dashboard Setup Progress Widget (when Step 2 incomplete)
- [ ] Verify "Back to Import" link works
- [ ] Check responsive design (mobile/tablet)
- [ ] Verify screenshot placeholders are visible

## Next Steps (Optional)

1. **Add Screenshots**: Replace placeholders with actual screenshots from AWS/GCP/Azure consoles
2. **Video Tutorials**: Add embedded video links for each provider
3. **Interactive Guide**: Create step-by-step interactive walkthrough
4. **Provider-Specific Templates**: Provide pre-formatted CSV templates for each provider's export format

---

**Status**: ✅ **HELP PAGE COMPLETE AND DEPLOYED**

**Final URL**: `https://pulse-sigma-eight.vercel.app/help/import-csv`



