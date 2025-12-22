'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OnboardingStep1Props {
  organizations: Array<{ id: string; name: string; role: string }>
  onComplete: () => void
}

export default function OnboardingStep1({ organizations, onComplete }: OnboardingStep1Props) {
  const router = useRouter()
  const [selectedOrg, setSelectedOrg] = useState<string>('')

  const handleContinue = async () => {
    if (selectedOrg) {
      // Set as active organization
      await fetch('/api/active-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: selectedOrg }),
      })
      router.refresh()
      onComplete()
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 1: Choose or Create Organization</h2>
      <p className="text-gray-600 mb-6">
        Select an organization to manage, or create a new one.
      </p>

      {organizations.length > 0 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Organization
            </label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose an organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.role})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleContinue}
              disabled={!selectedOrg}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
            <Link
              href="/organizations/new?onboarding=true"
              className="px-6 py-2 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50"
            >
              Create New Organization
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You don't have any organizations yet.</p>
          <Link
            href="/organizations/new?onboarding=true"
            className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
          >
            Create Your First Organization
          </Link>
        </div>
      )}
    </div>
  )
}

