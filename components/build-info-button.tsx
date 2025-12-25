'use client'

import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'

/**
 * BuildInfoButton - Admin-only button to check build information
 * 
 * IMPORTANT: This component is only rendered server-side if user is admin.
 * No gating logic here - if this component is mounted, user is admin.
 * 
 * The modal is only rendered client-side after user interaction to avoid hydration issues.
 */
export default function BuildInfoButton() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Only render modal after client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleBuildInfo = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    setShowModal(true) // Open modal immediately to show loading state

    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      try {
        const res = await fetch('/api/debug/build', {
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
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch build info')
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
    handleBuildInfo()
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
      <button
        onClick={handleBuildInfo}
        disabled={loading}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Build info (Admin only)"
      >
        <Info className="h-4 w-4 mr-1.5" />
        {loading ? 'Loading...' : 'Build info'}
      </button>

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
                  <h3 className="text-lg font-medium text-gray-900">Build Information</h3>
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
                    {/* Key info highlighted */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                          Commit
                        </p>
                        <p className="text-2xl font-bold text-blue-900 font-mono">
                          {data.commitShaShort}
                        </p>
                        <p className="text-xs text-blue-700 mt-1 font-mono">
                          {data.commitSha}
                        </p>
                      </div>
                      <div className={`border rounded-lg p-4 ${
                        data.env === 'production'
                          ? 'bg-green-50 border-green-200'
                          : data.env === 'preview'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                          data.env === 'production'
                            ? 'text-green-600'
                            : data.env === 'preview'
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                        }`}>
                          Environment
                        </p>
                        <p className={`text-2xl font-bold ${
                          data.env === 'production'
                            ? 'text-green-900'
                            : data.env === 'preview'
                            ? 'text-yellow-900'
                            : 'text-gray-900'
                        }`}>
                          {data.env}
                        </p>
                      </div>
                    </div>

                    {/* Build timestamp */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                        Build Time
                      </p>
                      <p className="text-sm text-gray-900">
                        {new Date(data.buildTimestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZoneName: 'short',
                        })}
                      </p>
                    </div>

                    {/* App Version */}
                    {data.appVersion && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                          App Version
                        </p>
                        <p className="text-2xl font-bold text-purple-900">
                          {data.appVersion}
                        </p>
                      </div>
                    )}

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
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading...</span>
                  </div>
                )}

                {!loading && !data && !error && (
                  <p className="text-sm text-gray-500">Click "Build info" to fetch data.</p>
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

