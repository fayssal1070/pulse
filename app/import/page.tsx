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
                <p className="mt-2 text-sm text-gray-500">
                  Required columns: <code className="bg-gray-100 px-1 rounded">date</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">provider</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">service</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">amountEUR</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">currency</code>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Date format: YYYY-MM-DD | Provider: AWS, GCP, Azure, or Other
                </p>
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

