import Link from 'next/link'
import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'
import { getCurrentUser } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import PricingActions from './pricing-actions'

export default async function PricingPage() {
  const user = await getCurrentUser()
  const activeOrg = user ? await getActiveOrganization(user.id) : null
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Choose the plan that fits your cloud cost management needs. All plans include core features with no hidden fees.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Starter Tier */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-8 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                  <p className="text-gray-600 text-sm mb-4">Perfect for getting started</p>
                  <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">Free</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Up to 3 cloud accounts</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Cost tracking & analytics</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Monthly budget alerts</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">CSV import</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Email support</span>
                  </li>
                </ul>
                <PricingActions plan="FREE" user={user} activeOrg={activeOrg} />
              </div>

              {/* Pro Tier - Featured */}
              <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-600 p-8 flex flex-col relative">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                  <p className="text-gray-600 text-sm mb-4">For growing teams with multiple accounts</p>
                  <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">€49</span>
                  <span className="text-gray-600 ml-2">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Everything in Starter</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">3 cloud accounts</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Advanced analytics & reports</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Custom alert rules</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Team collaboration (up to 5 members)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Priority support</span>
                  </li>
                </ul>
                <PricingActions plan="PRO" user={user} activeOrg={activeOrg} />
              </div>

              {/* Business Tier */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-8 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
                  <p className="text-gray-600 text-sm mb-4">For enterprises with complex needs</p>
                  <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">€149</span>
                  <span className="text-gray-600 ml-2">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Everything in Pro</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">10 cloud accounts, 50 alerts, 20 members</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">API access & webhooks</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Custom integrations</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Dedicated account manager</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">SLA guarantee</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">24/7 phone support</span>
                  </li>
                </ul>
                <PricingActions plan="BUSINESS" user={user} activeOrg={activeOrg} />
              </div>
            </div>

            {/* CTA Section */}
            <div className="mt-16 text-center">
              <p className="text-gray-600 mb-6">
                Not sure which plan is right for you? Try our demo or request early access.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/demo"
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Interactive Demo
                </Link>
                <Link
                  href="/demo#demo-early-access"
                  className="px-8 py-3 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Request Early Access
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-600">Everything you need to know about PULSE</p>
            </div>

            <div className="space-y-8">
              {/* FAQ Item 1 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  How do I connect my cloud accounts?
                </h3>
                <p className="text-gray-600">
                  Currently, PULSE supports manual cloud account setup and CSV import. You can add your AWS, GCP, Azure, or other cloud accounts manually, and import cost data via CSV files. We're working on direct API integrations with major cloud providers, which will be available in future updates.
                </p>
              </div>

              {/* FAQ Item 2 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Is my data secure?
                </h3>
                <p className="text-gray-600">
                  Yes, security is our top priority. All data is encrypted in transit using TLS/SSL. We use industry-standard security practices, and your cost data is stored securely in our database. We never store your cloud provider credentials - you maintain full control over your accounts.
                </p>
              </div>

              {/* FAQ Item 3 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  What cloud providers do you support?
                </h3>
                <p className="text-gray-600">
                  PULSE currently supports AWS, Google Cloud Platform (GCP), Microsoft Azure, and other cloud providers through CSV import. You can manually add accounts from any provider and import cost data in CSV format. Direct API integrations are coming soon.
                </p>
              </div>

              {/* FAQ Item 4 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I try PULSE before committing?
                </h3>
                <p className="text-gray-600">
                  Absolutely! We offer a fully interactive demo where you can explore all features with realistic sample data. No sign-up required. You can also request early access to try the full product with your own data.
                </p>
              </div>

              {/* FAQ Item 5 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  How does CSV import work?
                </h3>
                <p className="text-gray-600">
                  You can export your cloud cost data from your provider's billing console as a CSV file. PULSE accepts CSV files with columns for date, provider, service, amount (in EUR), and currency. Simply upload the file through our import interface, and we'll process and display your costs.
                </p>
              </div>

              {/* FAQ Item 6 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  What happens if I exceed my budget?
                </h3>
                <p className="text-gray-600">
                  PULSE will send you alerts when you're approaching or exceeding your monthly budget. You can configure custom alert thresholds and receive notifications via email. This helps you stay on top of your spending and make adjustments before costs spiral out of control.
                </p>
              </div>

              {/* FAQ Item 7 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I invite team members?
                </h3>
                <p className="text-gray-600">
                  Yes! Pro and Business plans include team collaboration features. You can invite team members to your organization, assign roles, and collaborate on cost management. Starter plan is designed for individual users or small teams.
                </p>
              </div>

              {/* FAQ Item 8 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Do you offer refunds?
                </h3>
                <p className="text-gray-600">
                  We're currently in early access phase and not processing payments yet. Once we launch paid plans, we'll offer a 30-day money-back guarantee. If you're not satisfied, contact us within 30 days for a full refund.
                </p>
              </div>
            </div>

            {/* Contact CTA */}
            <div className="mt-12 text-center">
              <p className="text-gray-600 mb-4">
                Still have questions? We're here to help.
              </p>
              <Link
                href="/contact"
                className="inline-block px-6 py-2 text-blue-600 font-medium hover:text-blue-700"
              >
                Contact Support →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
