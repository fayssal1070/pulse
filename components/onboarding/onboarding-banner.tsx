import Link from 'next/link'

export default function OnboardingBanner() {
  return (
    <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Finish setup</span> - Complete onboarding to unlock all features.
            </p>
          </div>
        </div>
        <Link
          href="/onboarding"
          className="ml-4 flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Go to Onboarding
        </Link>
      </div>
    </div>
  )
}

