'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OnboardingStepAIProvidersProps {
  organizationId: string
  onComplete: () => void
}

export default function OnboardingStepAIProviders({
  organizationId,
  onComplete,
}: OnboardingStepAIProvidersProps) {
  const router = useRouter()
  const [skipped, setSkipped] = useState(false)

  const handleSkip = () => {
    setSkipped(true)
    onComplete()
  }

  return (
    <div data-testid="onboarding-step-5">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 5: AI Providers (Optional)</h2>
      <p className="text-gray-600 mb-6">
        Connect AI providers (OpenAI, Anthropic, xAI, Google, Mistral) to route requests through Pulse.
        This step is optional - you can configure providers later.
      </p>

      <div className="border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            Configure AI providers to route all requests through Pulse for logging, costing, and budgeting.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/admin/integrations/ai"
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
            >
              Go to AI Providers →
            </Link>
            <button
              onClick={handleSkip}
              className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onComplete}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

