'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import OnboardingStep1 from './onboarding-step1'
import OnboardingStep2 from './onboarding-step2'
import OnboardingStep3 from './onboarding-step3'

interface OnboardingWizardProps {
  currentStep: number
  organizationId: string
  organizations: Array<{ id: string; name: string; role: string }>
  step1Completed: boolean
  step2Completed: boolean
  step3Completed: boolean
}

export default function OnboardingWizard({
  currentStep,
  organizationId,
  organizations,
  step1Completed,
  step2Completed,
  step3Completed,
}: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(currentStep)

  const handleSkip = async () => {
    try {
      await fetch(`/api/organizations/${organizationId}/onboarding/complete`, {
        method: 'POST',
      })
      router.push('/dashboard')
      router.refresh()
    } catch {
      alert('An error occurred')
    }
  }

  const handleStepComplete = (nextStep: number) => {
    setStep(nextStep)
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to PULSE</h1>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip setup
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      s < step ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        {step === 1 && (
          <OnboardingStep1
            organizations={organizations}
            onComplete={() => handleStepComplete(2)}
          />
        )}
        {step === 2 && (
          <OnboardingStep2
            organizationId={organizationId}
            onComplete={() => handleStepComplete(3)}
          />
        )}
        {step === 3 && (
          <OnboardingStep3
            organizationId={organizationId}
            onComplete={() => {
              router.push('/dashboard')
              router.refresh()
            }}
          />
        )}
      </div>
    </div>
  )
}

