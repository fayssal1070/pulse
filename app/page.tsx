import Link from 'next/link'
import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'
import WaitlistForm from '@/components/waitlist-form'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Take Control of Your
                <span className="text-blue-600"> Cloud Costs</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Monitor, analyze, and optimize your infrastructure spending with real-time insights and intelligent alerts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/demo"
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Demo
                </Link>
                <Link
                  href="/contact?action=demo"
                  className="px-8 py-3 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Request Demo
                </Link>
                <Link
                  href="/contact?action=waitlist"
                  className="px-8 py-3 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Join Waitlist
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Everything You Need to Manage Cloud Costs
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Simple, powerful tools to help you understand and control your infrastructure spending.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Monitoring</h3>
                <p className="text-gray-600">
                  Track your spending across all cloud providers in one unified dashboard. See exactly where your money goes.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Alerts</h3>
                <p className="text-gray-600">
                  Get notified immediately when spending exceeds your thresholds. Prevent budget overruns before they happen.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Cost Optimization</h3>
                <p className="text-gray-600">
                  Identify waste and opportunities to reduce spending. Make data-driven decisions about your infrastructure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Stop Surprises. Start Saving.
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Cloud costs can spiral out of control without proper visibility. PULSE gives you the insights you need to stay on budget and optimize spending.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Import costs from AWS, Azure, GCP, and more</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Set budgets and receive instant alerts</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Team collaboration with role-based access</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">Simple, intuitive interface</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-lg p-8">
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Last 7 Days</span>
                      <span className="text-lg font-bold text-gray-900">€2,450.00</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Monthly Budget</span>
                      <span className="text-lg font-bold text-gray-900">€10,000.00</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Services</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">AWS EC2</span>
                        <span className="text-gray-900 font-medium">€1,200.00</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Azure Storage</span>
                        <span className="text-gray-900 font-medium">€850.00</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GCP Compute</span>
                        <span className="text-gray-900 font-medium">€400.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-600 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Take Control of Your Cloud Costs?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join teams who are already saving thousands with PULSE.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/demo"
                className="px-8 py-3 bg-white text-blue-600 font-medium rounded-md hover:bg-gray-100 transition-colors"
              >
                Try Demo
              </Link>
              <Link
                href="/contact?action=demo"
                className="px-8 py-3 bg-white text-blue-600 font-medium rounded-md border-2 border-white hover:bg-gray-100 transition-colors"
              >
                Request Demo
              </Link>
              <Link
                href="/contact?action=waitlist"
                className="px-8 py-3 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800 transition-colors"
              >
                Join Waitlist
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
