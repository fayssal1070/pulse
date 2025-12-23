import Link from 'next/link'
import { generateDemoData } from '@/lib/demo-data-generator'
import DemoModeBadge from '@/components/demo-mode-badge'
import DemoActionDisabled from '@/components/demo-action-disabled'

export default function DemoPage() {
  const demoData = generateDemoData()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Mode Banner */}
      <div className="bg-yellow-50 border-b-4 border-yellow-400 p-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-yellow-700">
                <span className="font-semibold">DEMO MODE:</span> You are viewing demonstration data. This is not real cost information. All actions are disabled.
              </p>
            </div>
            <Link
              href="/register"
              className="ml-4 px-4 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200 transition-colors"
            >
              Sign Up to Get Started
            </Link>
          </div>
        </div>
      </div>

      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">PULSE</h1>
              <DemoModeBadge />
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-gray-900">
                Home
              </Link>
              <Link href="/register" className="text-gray-700 hover:text-gray-900">
                Sign Up
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-gray-900">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">
              Cost overview for Demo Organization
            </p>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last 7 days</h3>
              <p className="text-3xl font-bold text-gray-900">{demoData.total7Days.toFixed(2)} EUR</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last 30 days</h3>
              <p className="text-3xl font-bold text-gray-900">{demoData.total30Days.toFixed(2)} EUR</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-gray-500">Cloud Accounts</h3>
                <DemoActionDisabled actionName="Managing cloud accounts">
                  <Link
                    href="/accounts"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Manage →
                  </Link>
                </DemoActionDisabled>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{demoData.cloudAccountsInfo.total}</p>
              <div className="flex space-x-2 text-xs">
                <span className="text-green-600">{demoData.cloudAccountsInfo.active} active</span>
                {demoData.cloudAccountsInfo.pending > 0 && (
                  <span className="text-yellow-600">{demoData.cloudAccountsInfo.pending} pending</span>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-gray-500">Monthly Budget</h3>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    demoData.budgetInfo.status === 'EXCEEDED'
                      ? 'bg-red-100 text-red-800'
                      : demoData.budgetInfo.status === 'WARNING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {demoData.budgetInfo.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {demoData.budgetInfo.currentCosts.toFixed(2)} / {demoData.budgetInfo.budget.toFixed(2)} EUR
              </p>
              <p className="text-sm text-gray-500">
                {demoData.budgetInfo.percentage.toFixed(1)}% consumed
              </p>
              <DemoActionDisabled actionName="Managing budget">
                <Link
                  href="/budget"
                  className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block"
                >
                  Manage budget →
                </Link>
              </DemoActionDisabled>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Top Services */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Services (30 days)</h3>
              {demoData.topServices.length === 0 ? (
                <p className="text-gray-500 text-sm">No costs recorded</p>
              ) : (
                <div className="space-y-2">
                  {demoData.topServices.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.provider} / {item.service}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.total.toFixed(2)} EUR
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Organizations */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Organizations</h3>
                <DemoActionDisabled actionName="Creating organizations">
                  <Link
                    href="/organizations/new"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + New
                  </Link>
                </DemoActionDisabled>
              </div>
              <div className="space-y-2">
                <div className="block py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded px-2 -mx-2">
                  <p className="text-sm font-medium text-gray-900">Demo Organization</p>
                  <p className="text-xs text-gray-500">Role: owner</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Series Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Costs (30 days)</h3>
            {demoData.dailySeries.length === 0 ? (
              <p className="text-gray-500 text-sm">No costs recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total (EUR)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {demoData.dailySeries.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to get started?</h3>
            <p className="text-gray-600 mb-4">
              Sign up for free to start tracking your real cloud costs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 bg-white text-blue-600 font-medium rounded-md border-2 border-blue-600 hover:bg-blue-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

