'use client'

import { useState, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface UsageSummary {
  totalMtdEUR: number
  momDeltaPercent: number
  topApp: { id: string; name: string; amountEUR: number } | null
  topProvider: { provider: string; amountEUR: number } | null
}

interface UsageBreakdownItem {
  id: string
  name: string
  amountEUR: number
  percentOfTotal: number
  trend7d: number
}

interface UsagePageClientProps {
  organizationId: string
}

export default function UsagePageClient({ organizationId }: UsagePageClientProps) {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [breakdown, setBreakdown] = useState<UsageBreakdownItem[]>([])
  const [activeTab, setActiveTab] = useState<'app' | 'provider' | 'user' | 'project'>('app')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'mtd' | 'lastMonth'>('mtd')
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<{ dimension: string; id: string; name: string } | null>(null)

  useEffect(() => {
    loadSummary()
  }, [])

  useEffect(() => {
    loadBreakdown()
  }, [activeTab, dateRange])

  const loadSummary = async () => {
    try {
      const res = await fetch('/api/usage/summary')
      if (!res.ok) throw new Error('Failed to load summary')
      const data = await res.json()
      setSummary(data)
    } catch (err) {
      console.error('Failed to load summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBreakdown = async () => {
    try {
      const res = await fetch(`/api/usage/breakdown?dimension=${activeTab}&dateRange=${dateRange}`)
      if (!res.ok) throw new Error('Failed to load breakdown')
      const data = await res.json()
      setBreakdown(data)
    } catch (err) {
      console.error('Failed to load breakdown:', err)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/usage/export?dateRange=${dateRange}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pulse-usage-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export: ' + (err as Error).message)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading usage data...</div>
  }

  if (!summary) {
    return <div className="text-center py-8 text-red-600">Failed to load usage data</div>
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Usage</h1>
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          data-testid="usage-export-btn"
        >
          <Download className="w-4 h-4 mr-2" />
          Export finance CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6" data-testid="usage-kpi-total">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total this month</h3>
          <p className="text-2xl font-semibold text-gray-900">€{summary.totalMtdEUR.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6" data-testid="usage-kpi-mom">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Δ vs last month</h3>
          <div className="flex items-center">
            {summary.momDeltaPercent >= 0 ? (
              <TrendingUp className="w-5 h-5 text-red-600 mr-1" />
            ) : (
              <TrendingDown className="w-5 h-5 text-green-600 mr-1" />
            )}
            <p className={`text-2xl font-semibold ${summary.momDeltaPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.momDeltaPercent > 0 ? '+' : ''}
              {summary.momDeltaPercent.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6" data-testid="usage-kpi-top-app">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Top App</h3>
          {summary.topApp ? (
            <>
              <p className="text-lg font-semibold text-gray-900 truncate">{summary.topApp.name}</p>
              <p className="text-sm text-gray-600">€{summary.topApp.amountEUR.toFixed(2)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No app data</p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6" data-testid="usage-kpi-top-provider">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Top Provider</h3>
          {summary.topProvider ? (
            <>
              <p className="text-lg font-semibold text-gray-900">{summary.topProvider.provider}</p>
              <p className="text-sm text-gray-600">€{summary.topProvider.amountEUR.toFixed(2)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No provider data</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="mtd">Month to date</option>
          <option value="lastMonth">Last month</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['app', 'provider', 'user', 'project'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid={`usage-tab-${tab}`}
              >
                By {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Breakdown Table */}
        <div className="p-6">
          {breakdown.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No usage data for selected period</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (EUR)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Trend (7d)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {breakdown.map((item) => (
                  <tr key={item.id} className={item.percentOfTotal > 30 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.percentOfTotal > 30 && (
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                        )}
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">€{item.amountEUR.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{item.percentOfTotal.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end">
                        {item.trend7d >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-red-600 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
                        )}
                        <span className={item.trend7d >= 0 ? 'text-red-600' : 'text-green-600'}>
                          {item.trend7d > 0 ? '+' : ''}
                          {item.trend7d.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {item.percentOfTotal > 30 && (
                        <button
                          onClick={() => setSelectedItem({ dimension: activeTab, id: item.id, name: item.name })}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Drawer/Modal (simplified - can be enhanced) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedItem.name} Details</h2>
              <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-700">
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Details and timeseries data would go here...</p>
            <div className="flex gap-2">
              <a
                href={`/alerts/new?scopeType=${selectedItem.dimension.toUpperCase()}&scopeId=${selectedItem.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Alert
              </a>
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 border border-gray-300 rounded-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

