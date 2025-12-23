import Link from 'next/link'
import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'

export default function ImportCSVHelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-grow bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <Link
              href="/import"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
            >
              ← Back to Import
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              How to Export Cost Data from Cloud Providers
            </h1>
            <p className="text-xl text-gray-600">
              Step-by-step instructions to export your cloud costs as CSV files for import into PULSE.
            </p>
          </div>

          {/* AWS Section */}
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl font-bold text-orange-600">A</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Amazon Web Services (AWS)</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Method 1: Cost Explorer Export</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>Log in to the <strong>AWS Management Console</strong></li>
                  <li>Navigate to <strong>Billing & Cost Management</strong> → <strong>Cost Explorer</strong></li>
                  <li>Click <strong>"Reports"</strong> in the left sidebar</li>
                  <li>Select <strong>"Cost and Usage Reports"</strong> or use the <strong>"Download CSV"</strong> button in Cost Explorer</li>
                  <li>In Cost Explorer:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                      <li>Set your date range (e.g., last 30 days)</li>
                      <li>Group by: <strong>Service</strong></li>
                      <li>Click <strong>"Download CSV"</strong> or <strong>"Export"</strong></li>
                    </ul>
                  </li>
                  <li>Open the downloaded CSV file</li>
                  <li>Map columns to PULSE format:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                      <li><code>UsageStartDate</code> or <code>lineItem/UsageStartDate</code> → <code>date</code></li>
                      <li><code>ProductName</code> or <code>lineItem/ProductCode</code> → <code>provider</code> (set to "AWS")</li>
                      <li><code>lineItem/UsageType</code> or <code>ProductName</code> → <code>service</code></li>
                      <li><code>UnblendedCost</code> or <code>lineItem/UnblendedCost</code> → <code>amountEUR</code></li>
                      <li><code>lineItem/CurrencyCode</code> → <code>currency</code></li>
                    </ul>
                  </li>
                </ol>
                <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> AWS CSV exports may have different column names depending on your export method. 
                    You may need to rename columns or create a new CSV with the required format. The exact UI labels may vary 
                    based on your AWS account region and console version.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Method 2: Cost and Usage Reports (CUR)</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>Go to <strong>Billing & Cost Management</strong> → <strong>Cost and Usage Reports</strong></li>
                  <li>Click <strong>"Create report"</strong></li>
                  <li>Configure report settings:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                      <li>Report name: e.g., "PULSE-Import"</li>
                      <li>Time unit: <strong>Hourly</strong> or <strong>Daily</strong></li>
                      <li>Include: <strong>Resource IDs</strong> (optional)</li>
                    </ul>
                  </li>
                  <li>Set S3 bucket for delivery (or download manually)</li>
                  <li>Wait for report generation (usually within 24 hours)</li>
                  <li>Download the report CSV file</li>
                  <li>Transform to PULSE format (same column mapping as Method 1)</li>
                </ol>
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> CUR reports are more detailed but require S3 setup. For quick imports, 
                    use Method 1 (Cost Explorer export).
                  </p>
                </div>
              </div>

              {/* Screenshot Placeholder */}
              <div className="mt-6 p-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-gray-500 text-sm mb-2">📸 Screenshot Placeholder</p>
                <p className="text-xs text-gray-400">
                  AWS Cost Explorer → Download CSV button location
                </p>
              </div>
            </div>
          </section>

          {/* GCP Section */}
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl font-bold text-blue-600">G</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Google Cloud Platform (GCP)</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Billing Export to CSV</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>Log in to the <strong>Google Cloud Console</strong></li>
                  <li>Navigate to <strong>Billing</strong> → <strong>Reports</strong> (or <strong>Cost Analysis</strong>)</li>
                  <li>In the Billing Reports page:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                      <li>Select your billing account</li>
                      <li>Choose your date range</li>
                      <li>Group by: <strong>Service</strong> or <strong>SKU</strong></li>
                    </ul>
                  </li>
                  <li>Click the <strong>"Export"</strong> or <strong>"Download"</strong> button (usually in the top-right)</li>
                  <li>Select <strong>"CSV"</strong> format</li>
                  <li>Wait for the export to complete and download</li>
                  <li>Open the CSV file</li>
                  <li>Map columns to PULSE format:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                      <li><code>Usage date</code> or <code>Date</code> → <code>date</code></li>
                      <li>Set <code>provider</code> to <strong>"GCP"</strong> (add new column)</li>
                      <li><code>Service</code> or <code>Service description</code> → <code>service</code></li>
                      <li><code>Cost</code> or <code>Cost (EUR)</code> → <code>amountEUR</code></li>
                      <li><code>Currency</code> or <code>Currency code</code> → <code>currency</code></li>
                    </ul>
                  </li>
                </ol>
                <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> GCP billing exports may vary based on your billing account type and region. 
                    The exact menu names and column headers may differ. Look for "Export" or "Download" options in the 
                    Billing Reports or Cost Analysis sections.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Alternative: BigQuery Export</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>Enable <strong>Billing Export to BigQuery</strong> (if not already enabled)</li>
                  <li>Go to <strong>Billing</strong> → <strong>Billing export</strong></li>
                  <li>Query the BigQuery dataset using SQL</li>
                  <li>Export query results as CSV</li>
                  <li>Transform to PULSE format</li>
                </ol>
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> BigQuery export is more powerful but requires SQL knowledge. 
                    For most users, the Billing Reports CSV export is simpler.
                  </p>
                </div>
              </div>

              {/* Screenshot Placeholder */}
              <div className="mt-6 p-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-gray-500 text-sm mb-2">📸 Screenshot Placeholder</p>
                <p className="text-xs text-gray-400">
                  GCP Billing Reports → Export/Download button
                </p>
              </div>
            </div>
          </section>

          {/* Azure Section */}
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl font-bold text-blue-600">A</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Microsoft Azure</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Cost Management Export</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>Log in to the <strong>Azure Portal</strong></li>
                  <li>Navigate to <strong>Cost Management + Billing</strong> → <strong>Cost Management</strong></li>
                  <li>Go to <strong>"Cost analysis"</strong> or <strong>"Costs"</strong></li>
                  <li>Configure your view:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                      <li>Select your subscription or resource group</li>
                      <li>Set date range (e.g., last 30 days)</li>
                      <li>Group by: <strong>Service name</strong> or <strong>Meter category</strong></li>
                    </ul>
                  </li>
                  <li>Click <strong>"Export"</strong> or <strong>"Download"</strong> (usually in the top toolbar)</li>
                  <li>Select <strong>"Download CSV"</strong> or <strong>"Export to CSV"</strong></li>
                  <li>Wait for the export to generate and download</li>
                  <li>Open the CSV file</li>
                  <li>Map columns to PULSE format:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                      <li><code>Date</code> or <code>UsageDate</code> → <code>date</code></li>
                      <li>Set <code>provider</code> to <strong>"Azure"</strong> (add new column)</li>
                      <li><code>ServiceName</code> or <code>MeterCategory</code> → <code>service</code></li>
                      <li><code>Cost</code> or <code>CostInBillingCurrency</code> → <code>amountEUR</code></li>
                      <li><code>BillingCurrencyCode</code> or <code>Currency</code> → <code>currency</code></li>
                    </ul>
                  </li>
                </ol>
                <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Azure portal UI may vary based on your subscription type and region. 
                    The export option might be labeled "Download", "Export", or "Export data". Column names in the 
                    exported CSV may differ based on your export settings and Azure portal version.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Alternative: Usage Details API</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>Use Azure Cost Management API to fetch usage details</li>
                  <li>Convert API response to CSV format</li>
                  <li>Transform to PULSE format</li>
                </ol>
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> API method is for advanced users. Most users should use the Cost Management 
                    export feature in the Azure Portal.
                  </p>
                </div>
              </div>

              {/* Screenshot Placeholder */}
              <div className="mt-6 p-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-gray-500 text-sm mb-2">📸 Screenshot Placeholder</p>
                <p className="text-xs text-gray-400">
                  Azure Cost Management → Export/Download CSV option
                </p>
                </div>
            </div>
          </section>

          {/* General Tips */}
          <section className="bg-blue-50 rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">General Tips</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>Date Range:</strong> Export data for the last 30-90 days to get meaningful insights in PULSE.</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>Column Mapping:</strong> You may need to rename columns or create a new CSV with the exact column names PULSE expects.</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>Currency:</strong> PULSE accepts EUR and USD. If your export uses a different currency, convert amounts or contact support.</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>Need Help?</strong> If your CSV export doesn't match the expected format, download our <Link href="/api/csv/template" className="text-blue-600 hover:text-blue-700 underline">CSV template</Link> and manually map your data.</span>
              </li>
            </ul>
          </section>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/import"
              className="inline-block px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Import Page
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

