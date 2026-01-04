import Link from 'next/link'
import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>
}) {
  const params = await searchParams
  const source = params.source || 'general'

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-grow flex items-center justify-center bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Thank You!
            </h1>
            
            <p className="text-lg text-gray-600 mb-6">
              Thanks for your interest in PULSE. You'll receive access instructions by email.
            </p>

            {source === 'demo' && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-left">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">What's Next?</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Check your email for access instructions (may take a few minutes)</li>
                  <li>We'll send you setup instructions and login credentials</li>
                  <li>If you don't receive an email, check your spam folder</li>
                </ul>
              </div>
            )}

            <div className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Back to Home
                </Link>
                {source === 'demo' && (
                  <Link
                    href="/demo"
                    className="px-6 py-3 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Back to Demo
                  </Link>
                )}
                <Link
                  href="/register"
                  className="px-6 py-3 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Questions? Contact us at{' '}
                <a href="mailto:support@pulse.app" className="text-blue-600 hover:text-blue-700">
                  support@pulse.app
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}





