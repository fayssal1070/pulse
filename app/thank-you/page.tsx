'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'

function ThankYouPageContent() {
  const searchParams = useSearchParams()
  const source = searchParams.get('source') || 'landing'

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-grow flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            You've been added to our waitlist. We'll notify you as soon as PULSE is available and keep you updated on our progress.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            In the meantime, feel free to explore our website or contact us if you have any questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </Link>
            <Link
              href="/contact"
              className="px-6 py-2 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-grow flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading...</div>
        </main>
        <PublicFooter />
      </div>
    }>
      <ThankYouPageContent />
    </Suspense>
  )
}
