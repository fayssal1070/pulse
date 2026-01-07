'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BillingSuccessClientProps {
  sessionId?: string
}

export default function BillingSuccessClient({ sessionId }: BillingSuccessClientProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/billing')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h1 className="text-2xl font-bold text-green-900 mb-2">Payment Successful!</h1>
      <p className="text-green-800">
        Your payment has been received. We're syncing your subscription...
      </p>
      {sessionId && (
        <p className="text-sm text-green-700 mt-2">Session ID: {sessionId}</p>
      )}
      <p className="text-sm text-green-600 mt-4">
        Redirecting to billing page in 3 seconds...
      </p>
    </div>
  )
}

