'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ImportWizard from '@/components/import-wizard'

function ImportPageContent() {
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch active organization
    fetch('/api/active-org')
      .then(res => res.json())
      .then(data => {
        setOrgId(data.orgId || null)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
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

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Costs CSV</h2>
          
          {!orgId ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <p className="font-semibold">No active organization</p>
              <p className="text-sm mt-1">
                Please <Link href="/dashboard" className="underline">select an organization</Link> first.
              </p>
            </div>
          ) : (
            <ImportWizard organizationId={orgId} isOnboarding={isOnboarding} />
          )}
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
