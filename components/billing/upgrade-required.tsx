'use client'

import Link from 'next/link'

interface UpgradeRequiredProps {
  title?: string
  message: string
  feature?: string
  plan?: string
  requiredPlan?: string
  className?: string
}

export function UpgradeRequired({
  title = 'Upgrade Required',
  message,
  feature,
  plan,
  requiredPlan,
  className = '',
}: UpgradeRequiredProps) {
  return (
    <div
      data-testid="upgrade-required"
      className={`rounded-lg border border-yellow-300 bg-yellow-50 p-4 ${className}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">{title}</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>{message}</p>
            {plan && requiredPlan && (
              <p className="mt-1 text-xs">
                Current plan: <span className="font-semibold">{plan}</span> → Required: <span className="font-semibold">{requiredPlan}</span>
              </p>
            )}
            {feature && (
              <p className="mt-1 text-xs text-yellow-600">
                Feature: {feature}
              </p>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/billing"
              className="inline-flex items-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
            >
              Go to Billing
            </Link>
            <Link
              href="/billing/preview"
              className="inline-flex items-center rounded-md border border-yellow-300 bg-white px-3 py-2 text-sm font-medium text-yellow-700 shadow-sm hover:bg-yellow-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

