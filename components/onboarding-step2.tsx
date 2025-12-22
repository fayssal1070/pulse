'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OnboardingStep2Props {
  organizationId: string
  onComplete: () => void
}

export default function OnboardingStep2({ organizationId, onComplete }: OnboardingStep2Props) {
  const router = useRouter()
  const [cloudProvider, setCloudProvider] = useState('')
  const [accountName, setAccountName] = useState('')

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    // For MVP, we just mark step 2 as complete (declarative)
    // In production, this would save the cloud account info
    router.refresh()
    onComplete()
  }

  const handleImportCSV = () => {
    // Redirect to import page
    router.push(`/import?onboarding=true`)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 2: Add Cloud Account</h2>
      <p className="text-gray-600 mb-6">
        Connect your cloud provider or import cost data from a CSV file.
      </p>

      <div className="space-y-6">
        {/* Declarative form */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Cloud Account (Declarative)</h3>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cloud Provider
              </label>
              <select
                value={cloudProvider}
                onChange={(e) => setCloudProvider(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select provider...</option>
                <option value="AWS">AWS</option>
                <option value="GCP">Google Cloud Platform</option>
                <option value="Azure">Microsoft Azure</option>
                <option value="DigitalOcean">DigitalOcean</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., Production Account"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
            >
              Add Account
            </button>
          </form>
        </div>

        {/* Or import CSV */}
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Import from CSV</h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV file with your cost data.
          </p>
          <button
            onClick={handleImportCSV}
            className="px-6 py-2 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50"
          >
            Import CSV
          </button>
        </div>
      </div>
    </div>
  )
}

