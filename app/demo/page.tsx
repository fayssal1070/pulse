import Link from 'next/link'
import {
  DEMO_CLOUD_ACCOUNTS,
  DEMO_BUDGETS,
  DEMO_ALERTS,
  getMonthlyTrend,
  getCurrentMonthTotal,
  getTopCostDrivers,
} from '@/lib/demo-dataset'
import DemoModeBadge from '@/components/demo-mode-badge'
import DemoActionDisabled from '@/components/demo-action-disabled'

export default function DemoPage() {
  const monthlyTotal = getCurrentMonthTotal()
  const monthlyTrend = getMonthlyTrend()
  const topCostDrivers = getTopCostDrivers(5)
  const activeAlerts = DEMO_ALERTS.filter(a => !a.resolved)
  const maxTrendValue = Math.max(...monthlyTrend.map(t => t.total))

  // Calculate totals for last 7 and 30 days from trend
  const last30DaysTotal = monthlyTrend.slice(-1)[0]?.total || 0
  const last7DaysEstimate = last30DaysTotal * 0.23 // Approximate 7/30 ratio

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
              <p className="text-3xl font-bold text-gray-900">{last7DaysEstimate.toFixed(2)} EUR</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last 30 days</h3>
              <p className="text-3xl font-bold text-gray-900">{last30DaysTotal.toFixed(2)} EUR</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Total</h3>
              <p className="text-3xl font-bold text-gray-900">{monthlyTotal.toFixed(2)} EUR</p>
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
              <p className="text-3xl font-bold text-gray-900 mb-1">{DEMO_CLOUD_ACCOUNTS.length}</p>
              <div className="flex space-x-2 text-xs">
                <span className="text-green-600">
                  {DEMO_CLOUD_ACCOUNTS.filter(a => a.status === 'active').length} active
                </span>
              </div>
            </div>
          </div>

          {/* 12 Month Trend */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">12-Month Spending Trend</h3>
            <div className="space-y-3">
              {monthlyTrend.map((month, idx) => {
                const percentage = (month.total / maxTrendValue) * 100
                const monthLabel = new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                return (
                  <div key={idx} className="flex items-center">
                    <div className="w-20 text-xs text-gray-600 font-medium">{monthLabel}</div>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="text-xs text-white font-semibold">
                            {month.total.toFixed(0)}€
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm font-semibold text-gray-900">
                      {month.total.toFixed(2)} EUR
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Top 5 Cost Drivers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Cost Drivers</h3>
              {topCostDrivers.length === 0 ? (
                <p className="text-gray-500 text-sm">No costs recorded</p>
              ) : (
                <div className="space-y-3">
                  {topCostDrivers.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-gray-400 mr-3">#{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.provider} / {item.service}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.total.toFixed(2)} EUR
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
              {activeAlerts.length === 0 ? (
                <p className="text-gray-500 text-sm">No active alerts</p>
              ) : (
                <div className="space-y-3">
                  {activeAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded mr-2 ${
                                alert.severity === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : alert.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {alert.triggeredAt.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">{alert.title}</p>
                          <p className="text-xs text-gray-600">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Budgets */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Budgets</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEMO_BUDGETS.map((budget) => (
                <div key={budget.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{budget.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        budget.status === 'EXCEEDED'
                          ? 'bg-red-100 text-red-800'
                          : budget.status === 'WARNING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {budget.status}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {budget.currentSpendEUR.toFixed(2)} / {budget.monthlyLimitEUR.toFixed(2)} EUR
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        budget.status === 'EXCEEDED'
                          ? 'bg-red-600'
                          : budget.status === 'WARNING'
                          ? 'bg-yellow-600'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{budget.percentage.toFixed(1)}% consumed</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cloud Accounts List */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cloud Accounts</h3>
            <div className="space-y-2">
              {DEMO_CLOUD_ACCOUNTS.map((account) => (
                <div key={account.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.accountName}</p>
                    <p className="text-xs text-gray-500">
                      {account.provider} • {account.accountIdentifier}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      account.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : account.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {account.status}
                  </span>
                </div>
              ))}
            </div>
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
