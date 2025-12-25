'use client'

import { useState, useEffect } from 'react'
import { Bug } from 'lucide-react'
import BuildInfoButton from './build-info-button'

/**
 * DebugCostsButton - Admin-only debug button for cost data
 * 
 * IMPORTANT: This component is only rendered server-side if user is admin.
 * No gating logic here - if this component is mounted, user is admin.
 * This ensures SSR/CSR markup match (no hydration mismatch).
 * 
 * The modal is only rendered client-side after user interaction to avoid hydration issues.
 */
export default function DebugCostsButton() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'aws-raw'>('summary')

  // Only render modal after client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDebug = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    setShowModal(true) // Open modal immediately to show loading state

    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      try {
        const res = await fetch('/api/debug/costs', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          let errorMessage = `HTTP ${res.status}`
          let errorDetails = null
          
          try {
            const errorData = await res.json()
            errorMessage = errorData.error || errorMessage
            errorDetails = errorData
          } catch (e) {
            // If JSON parsing fails, use status text
            errorMessage = res.statusText || errorMessage
          }

          setError(`${errorMessage} (Status: ${res.status})`)
          setData(errorDetails) // Store error details for debugging
          return
        }

        const json = await res.json()
        setData(json)
        setError(null)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        if (fetchError.name === 'AbortError') {
          setError('Request timeout (10s). The server may be slow or unavailable.')
        } else {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch debug data')
        }
      }
    } catch (err) {
      // Catch any unexpected errors
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    handleDebug()
  }

  const handleCopyJSON = () => {
    if (data) {
      const jsonString = JSON.stringify(data, null, 2)
      navigator.clipboard.writeText(jsonString).then(() => {
        // Show temporary success feedback
        const button = document.activeElement as HTMLElement
        const originalText = button.textContent
        button.textContent = 'Copied!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = jsonString
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      })
    }
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleDebug}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Debug costs data (Admin only)"
        >
          <Bug className="h-4 w-4 mr-1.5" />
          {loading ? 'Loading...' : 'Debug costs'}
        </button>
        <BuildInfoButton />
      </div>

      {/* Only render modal after client-side mount to avoid hydration mismatch */}
      {mounted && showModal && (
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
                    <button
                      onClick={handleRetry}
                      className="mt-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {data && (
                  <div className="space-y-4">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          onClick={() => setActiveTab('summary')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'summary'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Summary
                        </button>
                        <button
                          onClick={() => setActiveTab('aws-raw')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'aws-raw'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          AWS Raw
                        </button>
                      </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'summary' && (
                      <>
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
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Full Response:</p>
                            <button
                              onClick={handleCopyJSON}
                              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                              Copy JSON
                            </button>
                          </div>
                          <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs overflow-x-auto max-h-96">
                            {JSON.stringify(data, null, 2)}
                          </pre>
                        </div>
                      </>
                    )}

                    {activeTab === 'aws-raw' && (
                      <div className="space-y-4">
                        {data.lastAwsFetch ? (
                          <>
                            {/* Request Parameters */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Request Parameters</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Start:</span>
                                  <span className="font-mono text-gray-900">{data.lastAwsFetch.start || data.lastAwsFetch.timePeriod?.start || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">End:</span>
                                  <span className="font-mono text-gray-900">{data.lastAwsFetch.end || data.lastAwsFetch.timePeriod?.end || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Metric:</span>
                                  <span className="font-mono text-gray-900">{data.lastAwsFetch.metric || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Granularity:</span>
                                  <span className="font-mono text-gray-900">{data.lastAwsFetch.granularity || 'DAILY'}</span>
                                </div>
                              </div>
                            </div>

                            {/* First Result Total */}
                            {data.lastAwsFetch.firstResultTotalAmount && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-blue-900 mb-3">First Result Total (from AWS)</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-blue-600">Amount:</span>
                                    <span className="font-mono font-bold text-blue-900">{data.lastAwsFetch.firstResultTotalAmount}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-blue-600">Unit:</span>
                                    <span className="font-mono text-blue-900">{data.lastAwsFetch.firstResultTotalUnit || 'USD'}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Sample Groups */}
                            {data.lastAwsFetch.sampleGroups && data.lastAwsFetch.sampleGroups.length > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-green-900 mb-3">Sample Groups (3 services from AWS)</h4>
                                <div className="space-y-3">
                                  {data.lastAwsFetch.sampleGroups.map((group: any, idx: number) => (
                                    <div key={idx} className="bg-white rounded p-3 border border-green-200">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-green-900">{group.service || 'Unknown'}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <span className="text-green-600">Amount:</span>
                                        <span className="font-mono font-bold text-green-900">{group.amount}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <span className="text-green-600">Unit:</span>
                                        <span className="font-mono text-green-900">{group.unit || 'USD'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Computed Total */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-purple-900 mb-3">Computed Total (by PULSE)</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-purple-600">Total from AWS:</span>
                                  <span className="font-mono font-bold text-purple-900">
                                    {data.lastAwsFetch.computedTotalFromAws?.toFixed(2) || data.lastAwsFetch.totalFromAws?.toFixed(2) || '0.00'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-purple-600">Currency:</span>
                                  <span className="font-mono text-purple-900">{data.lastAwsFetch.currencyFromAws || 'USD'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-purple-600">Record Count:</span>
                                  <span className="font-mono text-purple-900">{data.lastAwsFetch.recordCount || 0}</span>
                                </div>
                              </div>
                            </div>

                            {/* Comparison */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-yellow-900 mb-3">Comparison</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-yellow-600">AWS First Result Total:</span>
                                  <span className="font-mono text-yellow-900">
                                    {data.lastAwsFetch.firstResultTotalAmount || 'N/A'} {data.lastAwsFetch.firstResultTotalUnit || ''}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-yellow-600">PULSE Computed Total:</span>
                                  <span className="font-mono text-yellow-900">
                                    {data.lastAwsFetch.computedTotalFromAws?.toFixed(2) || data.lastAwsFetch.totalFromAws?.toFixed(2) || '0.00'} {data.lastAwsFetch.currencyFromAws || 'USD'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-yellow-600">DB Sum (30d):</span>
                                  <span className="font-mono text-yellow-900">
                                    {data.sum_30d?.toFixed(2) || '0.00'} EUR
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-500">
                              No AWS fetch data available. Enable AWS_SYNC_DEBUG=true and run a sync to see raw AWS data.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading...</span>
                  </div>
                )}

                {!loading && !data && !error && (
                  <p className="text-sm text-gray-500">Click "Debug costs" to fetch data.</p>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:space-x-reverse sm:space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
                {error && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

