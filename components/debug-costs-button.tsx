'use client'

import { useState } from 'react'
import { Bug } from 'lucide-react'

interface DebugCostsButtonProps {
  isAdmin: boolean
}

export default function DebugCostsButton({ isAdmin }: DebugCostsButtonProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Don't render anything if not admin - this is safe because isAdmin is passed from server
  // and won't change between SSR and CSR
  if (!isAdmin) {
    return null
  }

  const handleDebug = async () => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await fetch('/api/debug/costs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      const json = await res.json()
      setData(json)
      setShowModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debug data')
      setShowModal(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleDebug}
        disabled={loading}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Debug costs data (Admin only)"
      >
        <Bug className="h-4 w-4 mr-1.5" />
        {loading ? 'Loading...' : 'Debug costs'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

            <div
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Debug Costs Data</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">Error</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                )}

                {data && (
                  <div className="space-y-4">
                    {/* Key metrics highlighted */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                          Sum (30 days)
                        </p>
                        <p className="text-2xl font-bold text-blue-900">
                          {data.sum_30d?.toFixed(2) || '0.00'} EUR
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                          Count (30 days)
                        </p>
                        <p className="text-2xl font-bold text-green-900">
                          {data.count_30d || 0}
                        </p>
                      </div>
                    </div>

                    {/* Full JSON */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Full Response:</p>
                      <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs overflow-x-auto max-h-96">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {!data && !error && (
                  <p className="text-sm text-gray-500">Click "Debug costs" to fetch data.</p>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

