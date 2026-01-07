'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ColumnMapping {
  date: string | null
  provider: string | null
  service: string | null
  amountEUR: string | null
  currency: string | null
}

interface PreviewRow {
  raw: string[]
  mapped: {
    date: string
    provider: string
    service: string
    amountEUR: string
    currency: string
  } | null
  errors: string[]
}

interface ImportWizardProps {
  organizationId: string | null
  isOnboarding?: boolean
}

export default function ImportWizard({ organizationId, isOnboarding = false }: ImportWizardProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState(1) // 1: Upload, 2: Mapping, 3: Preview, 4: Importing
  const [file, setFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: null,
    provider: null,
    service: null,
    amountEUR: null,
    currency: null,
  })
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [previewTotal, setPreviewTotal] = useState<number>(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    importedCount: number
    rejectedCount: number
    rejectedSamples: Array<{ line: number; reason: string }>
  } | null>(null)

  // Common column name variations
  const columnVariations: Record<string, string[]> = {
    date: ['date', 'usage date', 'usage_date', 'billing date', 'billing_date', 'period', 'day', 'timestamp'],
    provider: ['provider', 'cloud provider', 'cloud_provider', 'platform', 'vendor'],
    service: ['service', 'service name', 'service_name', 'product', 'product name', 'product_name', 'sku', 'meter category', 'meter_category'],
    amountEUR: ['amounteur', 'amount eur', 'amount_eur', 'cost', 'cost eur', 'cost_eur', 'unblended cost', 'unblended_cost', 'cost in billing currency', 'amount'],
    currency: ['currency', 'currency code', 'currency_code', 'billing currency', 'billing_currency'],
  }

  const autoDetectColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      date: null,
      provider: null,
      service: null,
      amountEUR: null,
      currency: null,
    }

    headers.forEach((header, index) => {
      const normalizedHeader = header.trim().toLowerCase()
      
      for (const [key, variations] of Object.entries(columnVariations)) {
        if (variations.some(v => normalizedHeader.includes(v))) {
          if (mapping[key as keyof ColumnMapping] === null) {
            mapping[key as keyof ColumnMapping] = header
          }
        }
      }
    })

    return mapping
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return

    const selectedFile = e.target.files[0]
    setFile(selectedFile)
    setError('')
    setResult(null)

    try {
      const text = await selectedFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setError('CSV must have at least a header and one data row')
        return
      }

      // Parse CSV (simple parser, handles quoted values)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          const nextChar = line[i + 1]

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0])
      const rows = lines.slice(1, Math.min(21, lines.length)).map(parseCSVLine) // First 20 rows for preview

      setCsvHeaders(headers)
      setCsvRows(rows)

      // Auto-detect columns
      const detected = autoDetectColumns(headers)
      setColumnMapping(detected)

      // Move to mapping step
      setStep(2)
    } catch (err) {
      setError('Failed to parse CSV file. Please ensure it is a valid CSV format.')
    }
  }

  const validateMapping = (): boolean => {
    const errors: string[] = []
    
    if (!columnMapping.date) errors.push('Date column is required')
    if (!columnMapping.service) errors.push('Service column is required')
    if (!columnMapping.amountEUR) errors.push('Amount column is required')
    if (!columnMapping.currency) errors.push('Currency column is required')
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const generatePreview = () => {
    if (!validateMapping()) {
      return
    }

    const dateIndex = csvHeaders.indexOf(columnMapping.date!)
    const providerIndex = columnMapping.provider ? csvHeaders.indexOf(columnMapping.provider) : -1
    const serviceIndex = csvHeaders.indexOf(columnMapping.service!)
    const amountIndex = csvHeaders.indexOf(columnMapping.amountEUR!)
    const currencyIndex = csvHeaders.indexOf(columnMapping.currency!)

    const preview: PreviewRow[] = []
    let total = 0

    csvRows.forEach((row, rowIndex) => {
      const errors: string[] = []
      const mapped: any = {}

      // Extract values
      const dateValue = dateIndex >= 0 && dateIndex < row.length ? row[dateIndex] : ''
      const providerValue = providerIndex >= 0 && providerIndex < row.length ? row[providerIndex] : selectedProvider || 'AWS'
      const serviceValue = serviceIndex >= 0 && serviceIndex < row.length ? row[serviceIndex] : ''
      const amountValue = amountIndex >= 0 && amountIndex < row.length ? row[amountIndex] : ''
      const currencyValue = currencyIndex >= 0 && currencyIndex < row.length ? row[currencyIndex] : 'EUR'

      // Validate date
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateValue || !dateRegex.test(dateValue)) {
        errors.push(`Invalid date format (expected YYYY-MM-DD, got: ${dateValue || 'empty'})`)
      } else {
        mapped.date = dateValue
      }

      // Validate provider
      const validProviders = ['AWS', 'GCP', 'Azure', 'Other']
      const normalizedProvider = providerValue.trim().toUpperCase()
      if (providerIndex >= 0 && !validProviders.some(p => normalizedProvider.includes(p))) {
        errors.push(`Invalid provider (expected AWS/GCP/Azure/Other, got: ${providerValue})`)
      } else {
        mapped.provider = validProviders.find(p => normalizedProvider.includes(p)) || selectedProvider || 'AWS'
      }

      // Validate service
      if (!serviceValue || serviceValue.trim().length === 0) {
        errors.push('Service name is required')
      } else {
        mapped.service = serviceValue.trim()
      }

      // Validate amount
      const amountNum = parseFloat(amountValue.replace(/[^\d.-]/g, ''))
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.push(`Invalid amount (expected positive number, got: ${amountValue})`)
      } else {
        mapped.amountEUR = amountNum.toFixed(2)
        total += amountNum
      }

      // Validate currency
      const validCurrencies = ['EUR', 'USD']
      const normalizedCurrency = currencyValue.trim().toUpperCase()
      if (!validCurrencies.includes(normalizedCurrency)) {
        errors.push(`Invalid currency (expected EUR/USD, got: ${currencyValue})`)
      } else {
        mapped.currency = normalizedCurrency
      }

      preview.push({
        raw: row,
        mapped: errors.length === 0 ? mapped : null,
        errors,
      })
    })

    setPreviewRows(preview)
    setPreviewTotal(total)
    setStep(3)
  }

  const handleImport = async () => {
    if (!file || !organizationId) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Create a new CSV with mapped columns
      const dateIndex = csvHeaders.indexOf(columnMapping.date!)
      const providerIndex = columnMapping.provider ? csvHeaders.indexOf(columnMapping.provider) : -1
      const serviceIndex = csvHeaders.indexOf(columnMapping.service!)
      const amountIndex = csvHeaders.indexOf(columnMapping.amountEUR!)
      const currencyIndex = csvHeaders.indexOf(columnMapping.currency!)

      // Read full file
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          const nextChar = line[i + 1]
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      // Create mapped CSV
      const mappedLines: string[] = ['date,provider,service,amountEUR,currency']
      
      lines.slice(1).forEach(line => {
        const row = parseCSVLine(line)
        if (row.length === 0) return

        const dateValue = dateIndex >= 0 && dateIndex < row.length ? row[dateIndex] : ''
        const providerValue = providerIndex >= 0 && providerIndex < row.length 
          ? row[providerIndex] 
          : selectedProvider || 'AWS'
        const serviceValue = serviceIndex >= 0 && serviceIndex < row.length ? row[serviceIndex] : ''
        const amountValue = amountIndex >= 0 && amountIndex < row.length ? row[amountIndex] : ''
        const currencyValue = currencyIndex >= 0 && currencyIndex < row.length ? row[currencyIndex] : 'EUR'

        // Normalize provider
        const normalizedProvider = providerValue.trim().toUpperCase()
        const validProviders = ['AWS', 'GCP', 'AZURE', 'OTHER']
        const provider = validProviders.find(p => normalizedProvider.includes(p)) || selectedProvider || 'AWS'

        // Normalize currency
        const normalizedCurrency = currencyValue.trim().toUpperCase()
        const currency = ['EUR', 'USD'].includes(normalizedCurrency) ? normalizedCurrency : 'EUR'

        // Parse amount
        const amountNum = parseFloat(amountValue.replace(/[^\d.-]/g, ''))
        if (!isNaN(amountNum) && amountNum > 0 && dateValue && serviceValue) {
          mappedLines.push(`${dateValue},${provider},${serviceValue},${amountNum.toFixed(2)},${currency}`)
        }
      })

      // Create blob and upload
      const blob = new Blob([mappedLines.join('\n')], { type: 'text/csv' })
      const mappedFile = new File([blob], 'mapped-import.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', mappedFile)

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Import failed')
        setStep(2) // Go back to mapping if error
        return
      }

      setResult({
        importedCount: data.importedCount,
        rejectedCount: data.rejectedCount,
        rejectedSamples: data.rejectedSamples || [],
      })

      // If onboarding, redirect back to onboarding after successful import
      if (isOnboarding && data.importedCount > 0) {
        setTimeout(() => {
          router.push('/onboarding')
          router.refresh()
        }, 1500)
      } else if (data.importedCount > 0) {
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1500)
      }
    } catch (err) {
      setError('An error occurred during import')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s < step
                  ? 'bg-green-500 text-white'
                  : s === step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  s < step ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Upload CSV File</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Quick Start</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="/api/csv/template"
                  download="pulse-import-template.csv"
                  className="px-4 py-2 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors text-center text-sm"
                >
                  📥 Download Template
                </a>
                <a
                  href="/api/csv/sample"
                  download="pulse-sample-data.csv"
                  className="px-4 py-2 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors text-center text-sm"
                >
                  📊 Download Sample
                </a>
              </div>
              <Link
                href="/help/import-csv"
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium block"
              >
                📖 How to export CSV from AWS, GCP, or Azure →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Map Columns</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
              <p className="font-semibold mb-2">Missing Required Columns:</p>
              <ul className="list-disc list-inside text-sm">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Cloud Provider (if not in CSV)
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select provider...</option>
                <option value="AWS">AWS</option>
                <option value="GCP">GCP</option>
                <option value="Azure">Azure</option>
                <option value="Other">Other</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Used if your CSV doesn't have a provider column
              </p>
            </div>

            {/* Column Mappings */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Map CSV Columns:</h4>
              
              {(['date', 'provider', 'service', 'amountEUR', 'currency'] as const).map((requiredCol) => (
                <div key={requiredCol}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {requiredCol === 'amountEUR' ? 'Amount (EUR)' : requiredCol.charAt(0).toUpperCase() + requiredCol.slice(1)}
                    {requiredCol !== 'provider' && <span className="text-red-500"> *</span>}
                  </label>
                  <select
                    value={columnMapping[requiredCol] || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, [requiredCol]: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Back
              </button>
              <button
                onClick={generatePreview}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Preview & Validate →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Preview & Import</h3>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Preview Amount:</span>
              <span className="text-2xl font-bold text-blue-600">{previewTotal.toFixed(2)} EUR</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Showing first {previewRows.length} rows. Full import will process all rows.
            </p>
          </div>

          <div className="mb-6 max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className={row.errors.length > 0 ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-xs text-gray-600">{idx + 1}</td>
                    <td className="px-3 py-2 text-xs">{row.mapped?.date || '-'}</td>
                    <td className="px-3 py-2 text-xs">{row.mapped?.provider || '-'}</td>
                    <td className="px-3 py-2 text-xs">{row.mapped?.service || '-'}</td>
                    <td className="px-3 py-2 text-xs">{row.mapped?.amountEUR || '-'} {row.mapped?.currency || ''}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.errors.length > 0 ? (
                        <span className="text-red-600" title={row.errors.join(', ')}>
                          ⚠️ {row.errors.length} error(s)
                        </span>
                      ) : (
                        <span className="text-green-600">✓ Valid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewRows.some(r => r.errors.length > 0) && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
              ⚠️ Some rows have validation errors and will be skipped during import.
            </p>
            <p className="text-xs text-yellow-700">
              Fix errors in your CSV or adjust column mapping, then preview again.
            </p>
          </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              ← Back to Mapping
            </button>
            <button
              onClick={handleImport}
              disabled={loading || previewRows.every(r => r.errors.length > 0)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="font-semibold">Import Results:</p>
          <p>✅ Imported: {result.importedCount} records</p>
          {result.rejectedCount > 0 && (
            <>
              <p>❌ Rejected: {result.rejectedCount} records</p>
              {result.rejectedSamples.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="font-semibold">Sample rejections:</p>
                  <ul className="list-disc list-inside mt-1">
                    {result.rejectedSamples.slice(0, 5).map((sample, idx) => (
                      <li key={idx}>
                        Line {sample.line}: {sample.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}






