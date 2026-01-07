import Link from 'next/link'
import { Check, Zap, Briefcase, Building2, ArrowRight } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Pulse
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your team. All plans include usage-based billing with clear, upfront pricing.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Usage beyond included quota is billed automatically at the end of each month — no interruptions.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* STARTER */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-8 relative">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                <h2 className="text-2xl font-bold text-gray-900">STARTER</h2>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">29€</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Perfect for testing Pulse</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Up to <strong>20€</strong> of AI usage included</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>1 user</strong></span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>1 AI provider</strong></span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Basic alerts</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Usage blocked at quota</span>
              </li>
            </ul>

            <Link
              href="/billing?plan=STARTER"
              className="block w-full text-center bg-gray-100 text-gray-900 px-6 py-3 rounded-md font-semibold hover:bg-gray-200 transition"
            >
              Start Free
            </Link>
          </div>

          {/* PRO - Most Popular */}
          <div className="bg-white rounded-lg shadow-xl border-2 border-blue-500 p-8 relative transform scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">PRO</h2>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">149€</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Perfect for product & finance teams</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>200€</strong> of AI usage included</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Pay-as-you-go overages (20% markup)</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>5 users</strong></span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Budgets by app / project</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Advanced alerts</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Telegram notifications</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Export data</span>
              </li>
            </ul>

            <Link
              href="/billing?plan=PRO"
              className="block w-full text-center bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              Upgrade <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* BUSINESS */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-8 relative">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-6 h-6 text-purple-500" />
                <h2 className="text-2xl font-bold text-gray-900">BUSINESS</h2>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">499€</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Perfect for scale-ups and serious SMEs</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>2000€</strong> of AI usage included</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Reduced-cost overages (10% markup)</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>25 users</strong></span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">All AI providers</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">AI governance</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Webhooks, Slack, Teams</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Extended data retention</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Priority support</span>
              </li>
            </ul>

            <Link
              href="/billing?plan=BUSINESS"
              className="block w-full text-center bg-purple-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
            >
              Upgrade <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* FAQ / Additional Info */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How does overage billing work?</h4>
              <p className="text-gray-600">
                If you exceed your included AI usage quota, we automatically bill the overage amount at the end of each month. 
                You can monitor your usage in real-time on your dashboard. No service interruptions — usage continues seamlessly.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I upgrade or downgrade anytime?</h4>
              <p className="text-gray-600">
                Yes. Upgrades take effect immediately. Downgrades apply at the end of your current billing period. 
                Changes can be made from your billing page.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What counts as "AI usage"?</h4>
              <p className="text-gray-600">
                AI usage is calculated based on the actual costs of API calls to AI providers (OpenAI, Anthropic, Google, etc.). 
                We track costs in euros, so you always know what you're spending.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">Ready to get started?</p>
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            View Current Plan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
