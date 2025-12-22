'use client'

import { useState } from 'react'

interface OnboardingStep3Props {
  organizationId: string
  onComplete: () => void
}

export default function OnboardingStep3({ organizationId, onComplete }: OnboardingStep3Props) {
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    setLoading(true)
    try {
      await fetch(`/api/organizations/${organizationId}/onboarding/complete`, {
        method: 'POST',
      })
      onComplete()
    } catch {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 3: You're All Set!</h2>
      <p className="text-gray-600 mb-6">
        Your organization is configured. You can now start monitoring your cloud costs.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">What's Next?</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• View your cost dashboard</li>
          <li>• Set up alert rules for budget monitoring</li>
          <li>• Configure your monthly budget</li>
          <li>• Invite team members</li>
        </ul>
      </div>

      <button
        onClick={handleComplete}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading...' : 'Go to Dashboard'}
      </button>
    </div>
  )
}

