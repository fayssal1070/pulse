'use client'

import Link from 'next/link'

interface SetupProgressWidgetProps {
  currentStep: number
  step1Completed: boolean
  step2Completed: boolean
  step3Completed: boolean
}

export default function SetupProgressWidget({
  currentStep,
  step1Completed,
  step2Completed,
  step3Completed,
}: SetupProgressWidgetProps) {
  if (currentStep === 0) {
    return null // All completed
  }

  const steps = [
    { num: 1, label: 'Choose Organization', completed: step1Completed },
    { num: 2, label: 'Add Cloud Account', completed: step2Completed },
    { num: 3, label: 'Complete Setup', completed: step3Completed },
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Setup Progress</h3>
        <Link
          href="/onboarding"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Complete Setup →
        </Link>
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.num} className="flex items-center space-x-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step.completed
                  ? 'bg-green-500 text-white'
                  : step.num === currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step.completed ? '✓' : step.num}
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span
                className={`text-sm ${
                  step.completed
                    ? 'text-gray-900'
                    : step.num === currentStep
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
              {step.num === 2 && !step.completed && (
                <Link
                  href="/help/import-csv"
                  className="text-xs text-blue-600 hover:text-blue-700 ml-2"
                  title="How to export CSV from cloud providers"
                >
                  Help →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

