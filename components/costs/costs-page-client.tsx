'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface CostsSummary {
  aiCost: number
  awsCost: number
  totalCost: number
  momDelta: number
  momDeltaPercent: number
  todayCost: number
}

interface BreakdownItem {
  id: string
  name: string
  amountEur: number
  percentage: number
  eventCount: number
}

interface CostEventRow {
  id: string
  occurredAt: string
  source: string
  provider: string | null
  model: string | null
  amountEur: number
  userId: string | null
  teamId: string | null
  projectId: string | null
  appId: string | null
  clientId: string | null
  service: string | null
  rawRef?: any
}

interface EventsResponse {
  events: CostEventRow[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

type DateRange = 'last7' | 'last30' | 'mtd' | 'lastMonth' | 'custom'
type Dimension = 'users' | 'teams' | 'projects' | 'apps' | 'clients' | 'models'

export default function CostsPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Filters state
  const [dateRange, setDateRange] = useState<DateRange>(
    (searchParams.get('dateRange') as DateRange) || 'last30'
  )
  const [customStartDate, setCustomStartDate] = useState(searchParams.get('startDate') || '')
  const [customEndDate, setCustomEndDate] = useState(searchParams.get('endDate') || '')
  const [provider, setProvider] = useState<'ALL' | string>(searchParams.get('provider') || 'ALL')
  const [dimension, setDimension] = useState<Dimension>(
    (searchParams.get('dimension') as Dimension) || 'users'
  )
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('pageSize') || '25'))
  
  // Dimension filters from URL (for drilldown)
  const [userId, setUserId] = useState(searchParams.get('userId') || '')
  const [teamId, setTeamId] = useState(searchParams.get('teamId') || '')
  const [projectId, setProjectId] = useState(searchParams.get('projectId') || '')
  const [appId, setAppId] = useState(searchParams.get('appId') || '')
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '')

  // Data state
  const [summary, setSummary] = useState<CostsSummary | null>(null)
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([])
  const [events, setEvents] = useState<CostEventRow[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, totalCount: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Build query params
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('dateRange', dateRange)
    if (dateRange === 'custom' && customStartDate) params.set('startDate', customStartDate)
    if (dateRange === 'custom' && customEndDate) params.set('endDate', customEndDate)
    if (provider !== 'ALL') params.set('provider', provider)
    if (dimension) params.set('dimension', dimension)
    if (search) params.set('search', search)
    if (userId) params.set('userId', userId)
    if (teamId) params.set('teamId', teamId)
    if (projectId) params.set('projectId', projectId)
    if (appId) params.set('appId', appId)
    if (clientId) params.set('clientId', clientId)
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    return params
  }, [dateRange, customStartDate, customEndDate, provider, dimension, search, userId, teamId, projectId, appId, clientId, page, pageSize])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = buildQueryParams()

    try {
      // Fetch summary, breakdown, and events in parallel
      const [summaryRes, breakdownRes, eventsRes] = await Promise.all([
        fetch(`/api/costs/summary?${params.toString()}`),
        fetch(`/api/costs/breakdown?${params.toString()}&limit=10`),
        fetch(`/api/costs/events?${params.toString()}`),
      ])

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData)
      }

      if (breakdownRes.ok) {
        const breakdownData = await breakdownRes.json()
        setBreakdown(breakdownData.breakdown || [])
      }

      if (eventsRes.ok) {
        const eventsData: EventsResponse = await eventsRes.json()
        setEvents(eventsData.events || [])
        setPagination(eventsData.pagination || { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 })
      }
    } catch (error) {
      console.error('Error fetching costs data:', error)
    } finally {
      setLoading(false)
    }
  }, [buildQueryParams])

  // Initialize dimension filters from URL (handles drilldown)
  useEffect(() => {
    const urlUserId = searchParams.get('userId')
    const urlTeamId = searchParams.get('teamId')
    const urlProjectId = searchParams.get('projectId')
    const urlAppId = searchParams.get('appId')
    const urlClientId = searchParams.get('clientId')
    const urlDateRange = searchParams.get('dateRange') || searchParams.get('range')
    const urlProvider = searchParams.get('provider')
    const urlDimension = searchParams.get('dimension')
    
    if (urlUserId !== null) setUserId(urlUserId || '')
    if (urlTeamId !== null) setTeamId(urlTeamId || '')
    if (urlProjectId !== null) setProjectId(urlProjectId || '')
    if (urlAppId !== null) setAppId(urlAppId || '')
    if (urlClientId !== null) setClientId(urlClientId || '')
    if (urlDateRange) setDateRange(urlDateRange as DateRange)
    if (urlProvider) setProvider(urlProvider)
    if (urlDimension) setDimension(urlDimension as Dimension)
  }, [searchParams])
  
  // Update URL when filters change
  useEffect(() => {
    const params = buildQueryParams()
    router.replace(`/costs?${params.toString()}`, { scroll: false })
  }, [dateRange, customStartDate, customEndDate, provider, dimension, search, userId, teamId, projectId, appId, clientId, page, pageSize, router, buildQueryParams])

  // Fetch data when filters change
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle export
  const handleExport = async () => {
    setExporting(true)
    try {
      const params = buildQueryParams()
      const response = await fetch(`/api/costs/export?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cost-events-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting costs:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div data-testid="costs-page">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Costs</h2>
          <p className="text-sm text-gray-500 mt-1">Track and analyze AWS and AI costs</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          data-testid="costs-export"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4" data-testid="costs-filters">
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
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="ALL">All Providers</option>
              <option value="aws">AWS</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by model, provider, service..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        {/* Dimension Tabs */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['users', 'teams', 'projects', 'apps', 'clients', 'models'] as Dimension[]).map((dim) => (
              <button
                key={dim}
                onClick={() => setDimension(dim)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  dimension === dim
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {dim}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-testid="costs-kpis">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">AI Cost</p>
            <p className="text-2xl font-bold text-gray-900">{summary.aiCost.toFixed(2)} €</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">AWS Cost</p>
            <p className="text-2xl font-bold text-gray-900">{summary.awsCost.toFixed(2)} €</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalCost.toFixed(2)} €</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">MoM Delta</p>
            <p className={`text-2xl font-bold ${summary.momDelta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.momDelta >= 0 ? '+' : ''}
              {summary.momDelta.toFixed(2)} € ({summary.momDeltaPercent.toFixed(1)}%)
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-2xl font-bold text-gray-900">{summary.todayCost.toFixed(2)} €</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4" data-testid="costs-breakdown">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top {dimension}</h3>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : breakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No data</p>
            ) : (
              <div className="space-y-3">
                {breakdown.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name || '(Unknown)'}</p>
                      <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}% • {item.eventCount} events</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.amountEur.toFixed(2)} €</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Events Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="costs-events-table">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Cost Events</h3>
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
            ) : events.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No cost events found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Model
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          App
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Id
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(event.occurredAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.provider || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.model || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {event.amountEur.toFixed(4)} €
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.userId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.teamId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.projectId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.appId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.clientId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.source}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                            {event.source === 'AI' && event.rawRef?.requestId ? (
                              <Link
                                href={`/governance/ai-logs/${event.rawRef.requestId}`}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {event.id}
                              </Link>
                            ) : (
                              event.id
                            )}
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
                      {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} events
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
        </div>
      </div>
    </div>
  )
}


