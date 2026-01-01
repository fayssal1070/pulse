'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface AiLogsSummary {
  totalRequests: number
  totalCost: number
  avgLatency: number
  errorRate: number
}

interface AiLogRow {
  id: string
  occurredAt: string
  provider: string
  model: string
  estimatedCostEur: number | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  latencyMs: number | null
  statusCode: number | null
  userId: string | null
  teamId: string | null
  projectId: string | null
  appId: string | null
  clientId: string | null
}

interface LogsResponse {
  summary: AiLogsSummary
  logs: AiLogRow[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

interface RetentionResponse {
  aiLogRetentionDays: number
}

type DateRange = 'last7' | 'last30' | 'mtd' | 'lastMonth' | 'custom'
type StatusCode = 'all' | '2xx' | '4xx' | '5xx'

export default function GovernanceClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Tab state
  const [activeTab, setActiveTab] = useState<'logs' | 'retention'>('logs')

  // Filters state
  const [dateRange, setDateRange] = useState<DateRange>(
    (searchParams.get('dateRange') as DateRange) || 'last30'
  )
  const [customStartDate, setCustomStartDate] = useState(searchParams.get('startDate') || '')
  const [customEndDate, setCustomEndDate] = useState(searchParams.get('endDate') || '')
  const [provider, setProvider] = useState(searchParams.get('provider') || '')
  const [model, setModel] = useState(searchParams.get('model') || '')
  const [statusCode, setStatusCode] = useState<StatusCode>(
    (searchParams.get('statusCode') as StatusCode) || 'all'
  )
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('pageSize') || '25'))

  // Data state
  const [summary, setSummary] = useState<AiLogsSummary | null>(null)
  const [logs, setLogs] = useState<AiLogRow[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, totalCount: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Retention state
  const [retentionDays, setRetentionDays] = useState(90)
  const [retentionLoading, setRetentionLoading] = useState(false)
  const [retentionSaving, setRetentionSaving] = useState(false)
  const [retentionInput, setRetentionInput] = useState('90')
  const [canEditRetention, setCanEditRetention] = useState(false)

  // Build query params
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('dateRange', dateRange)
    if (dateRange === 'custom' && customStartDate) params.set('startDate', customStartDate)
    if (dateRange === 'custom' && customEndDate) params.set('endDate', customEndDate)
    if (provider) params.set('provider', provider)
    if (model) params.set('model', model)
    if (statusCode !== 'all') params.set('statusCode', statusCode)
    if (search) params.set('search', search)
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    return params
  }, [dateRange, customStartDate, customEndDate, provider, model, statusCode, search, page, pageSize])

  // Fetch logs data
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = buildQueryParams()

    try {
      const response = await fetch(`/api/governance/ai-logs?${params.toString()}`)
      if (response.ok) {
        const data: LogsResponse = await response.json()
        setSummary(data.summary)
        setLogs(data.logs || [])
        setPagination(data.pagination || { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 })
      }
    } catch (error) {
      console.error('Error fetching AI logs:', error)
    } finally {
      setLoading(false)
    }
  }, [buildQueryParams])

  // Fetch retention settings
  const fetchRetention = useCallback(async () => {
    setRetentionLoading(true)
    try {
      const response = await fetch('/api/governance/retention')
      if (response.ok) {
        const data: RetentionResponse = await response.json()
        setRetentionDays(data.aiLogRetentionDays)
        setRetentionInput(data.aiLogRetentionDays.toString())
        // Check if user can edit (admin/finance)
        const canEdit = response.headers.get('x-can-edit') === 'true'
        setCanEditRetention(canEdit)
      }
    } catch (error) {
      console.error('Error fetching retention:', error)
    } finally {
      setRetentionLoading(false)
    }
  }, [])

  // Save retention
  const saveRetention = async () => {
    const days = parseInt(retentionInput)
    if (isNaN(days) || days < 1 || days > 3650) {
      alert('Retention days must be between 1 and 3650')
      return
    }

    setRetentionSaving(true)
    try {
      const response = await fetch('/api/governance/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiLogRetentionDays: days }),
      })

      if (response.ok) {
        setRetentionDays(days)
        alert('Retention settings saved')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save retention settings')
      }
    } catch (error) {
      console.error('Error saving retention:', error)
      alert('Failed to save retention settings')
    } finally {
      setRetentionSaving(false)
    }
  }

  // Update URL when filters change
  useEffect(() => {
    if (activeTab === 'logs') {
      const params = buildQueryParams()
      router.replace(`/governance?${params.toString()}`, { scroll: false })
    }
  }, [dateRange, customStartDate, customEndDate, provider, model, statusCode, search, page, pageSize, router, buildQueryParams, activeTab])

  // Fetch data when filters change
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    } else if (activeTab === 'retention') {
      fetchRetention()
    }
  }, [activeTab, fetchLogs, fetchRetention])

  // Handle export
  const handleExport = async () => {
    setExporting(true)
    try {
      const params = buildQueryParams()
      const response = await fetch(`/api/governance/ai-logs/export?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-logs-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting logs:', error)
    } finally {
      setExporting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusBadge = (statusCode: number | null) => {
    if (!statusCode) return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">-</span>
    if (statusCode >= 200 && statusCode < 300) {
      return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">{statusCode}</span>
    } else if (statusCode >= 400 && statusCode < 500) {
      return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">{statusCode}</span>
    } else {
      return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">{statusCode}</span>
    }
  }

  return (
    <div data-testid="governance-page">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Governance</h2>
          <p className="text-sm text-gray-500 mt-1">AI request logs audit trail and retention</p>
        </div>
        {activeTab === 'logs' && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="governance-export"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            AI Request Logs
          </button>
          <button
            onClick={() => setActiveTab('retention')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'retention'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Retention
          </button>
        </nav>
      </div>

      {/* AI Request Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {/* Filters */}
          <div className="mb-6 bg-white rounded-lg shadow p-4" data-testid="governance-filters">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="last7">Last 7 days</option>
                  <option value="last30">Last 30 days</option>
                  <option value="mtd">Month to Date</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </>
              )}

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="All providers"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="All models"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Status Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusCode}
                  onChange={(e) => setStatusCode(e.target.value as StatusCode)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All</option>
                  <option value="2xx">2xx (Success)</option>
                  <option value="4xx">4xx (Client Error)</option>
                  <option value="5xx">5xx (Server Error)</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          {/* KPIs */}
          {summary && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="governance-kpis">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Requests</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalRequests.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalCost)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Avg Latency</p>
                <p className="text-2xl font-bold text-gray-900">{summary.avgLatency}ms</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Error Rate</p>
                <p className="text-2xl font-bold text-gray-900">{summary.errorRate.toFixed(2)}%</p>
              </div>
            </div>
          )}

          {/* Logs Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="governance-logs-table">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">AI Request Logs</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value))
                    setPage(1)
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No logs found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Model
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost EUR
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tokens
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Latency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          App
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50" data-testid={`governance-log-row-${log.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.occurredAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.provider || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.model || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {log.estimatedCostEur ? formatCurrency(log.estimatedCostEur) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {log.totalTokens
                              ? `${log.inputTokens || 0}/${log.outputTokens || 0}`
                              : log.inputTokens || log.outputTokens
                                ? `${log.inputTokens || 0}/${log.outputTokens || 0}`
                                : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {log.latencyMs ? `${log.latencyMs}ms` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(log.statusCode)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.userId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.appId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.projectId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.clientId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/governance/ai-logs/${log.id}`}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                      {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}{' '}
                      logs
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                        disabled={page >= pagination.totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Retention Tab */}
      {activeTab === 'retention' && (
        <div className="bg-white rounded-lg shadow p-6" data-testid="governance-retention">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Log Retention Settings</h3>
          {retentionLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retention Period (days)
                </label>
                <input
                  type="number"
                  value={retentionInput}
                  onChange={(e) => setRetentionInput(e.target.value)}
                  min="1"
                  max="3650"
                  disabled={!canEditRetention || retentionSaving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Logs older than {retentionDays} days are deleted daily
                </p>
              </div>
              {canEditRetention && (
                <button
                  onClick={saveRetention}
                  disabled={retentionSaving || parseInt(retentionInput) === retentionDays}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {retentionSaving ? 'Saving...' : 'Save'}
                </button>
              )}
              {!canEditRetention && (
                <p className="text-sm text-gray-500">Only admin and finance roles can change retention settings</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

