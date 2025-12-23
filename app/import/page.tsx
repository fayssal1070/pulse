'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ImportPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    importedCount: number
    rejectedCount: number
    rejectedSamples: Array<{ line: number; reason: string }>
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
      setResult(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setError('')
    setResult(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Import failed')
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
      }
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                PULSE
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">Import</span>
            </div>
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Costs CSV</h2>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {result && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
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

              {/* CSV Template & Sample Downloads */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Need help getting started?</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="/api/csv/template"
                    download="pulse-import-template.csv"
                    className="px-4 py-2 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors text-center text-sm"
                  >
                    📥 Download CSV Template
                  </a>
                  <a
                    href="/api/csv/sample"
                    download="pulse-sample-data.csv"
                    className="px-4 py-2 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors text-center text-sm"
                  >
                    📊 Download Sample CSV
                  </a>
                </div>
                <p className="mt-3 text-xs text-gray-600">
                  The sample CSV contains 45 realistic records you can import immediately to see your dashboard populated.
                </p>
              </div>

              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                  CSV File
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".csv"
                  required
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Required columns:</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">date</code>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">provider</code>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">service</code>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">amountEUR</code>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">currency</code>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p>• <strong>date</strong>: Format YYYY-MM-DD (e.g., 2024-01-15)</p>
                    <p>• <strong>provider</strong>: AWS, GCP, Azure, or Other</p>
                    <p>• <strong>service</strong>: Service name (e.g., EC2, Compute Engine, Virtual Machines)</p>
                    <p>• <strong>amountEUR</strong>: Cost amount as number (e.g., 150.50)</p>
                    <p>• <strong>currency</strong>: EUR or USD</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import CSV'}
                </button>
                <Link
                  href="/dashboard"
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ImportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <ImportPageContent />
    </Suspense>
  )
}

