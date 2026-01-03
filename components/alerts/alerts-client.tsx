'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AlertRule {
  id: string
  name: string
  type: string
  enabled: boolean
  thresholdEUR: number | null
  spikePercent: number | null
  topSharePercent: number | null
  lookbackDays: number
  providerFilter: string | null
  cooldownHours: number
  lastTriggeredAt: string | null
  createdAt: string
  _count: {
    alertEvents: number
  }
}

interface AlertEvent {
  id: string
  triggeredAt: string
  severity: string
  amountEUR: number
  message: string
  periodStart: string
  periodEnd: string
  metadata: any
  alertRule: {
    id: string
    name: string
    type: string
  }
}

interface RulesResponse {
  rules: AlertRule[]
}

interface EventsResponse {
  events: AlertEvent[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

type DateRange = 'last7' | 'last30' | 'mtd' | 'custom'

export default function AlertsClient() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'rules' | 'events'>('rules')
  const [rules, setRules] = useState<AlertRule[]>([])
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, totalCount: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  // Events filters
  const [dateRange, setDateRange] = useState<DateRange>('last30')
  const [severity, setSeverity] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Fetch rules
  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts/rules')
      if (response.ok) {
        const data: RulesResponse = await response.json()
        setRules(data.rules || [])
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    }
  }, [])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', '25')
      params.set('dateRange', dateRange)
      if (severity) params.set('severity', severity)
      if (type) params.set('type', type)
      if (search) params.set('search', search)

      const response = await fetch(`/api/alerts/events?${params.toString()}`)
      if (response.ok) {
        const data: EventsResponse = await response.json()
        setEvents(data.events || [])
        setPagination(data.pagination || { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 })
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }, [page, dateRange, severity, type, search])

  // Toggle rule enabled
  const toggleRule = async (ruleId: string, enabled: boolean) => {
    setToggling(ruleId)
    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })

      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
    } finally {
      setToggling(null)
    }
  }

  // Delete rule
  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) {
      return
    }

    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchRules()
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'rules') {
      fetchRules()
    } else {
      fetchEvents()
    }
  }, [activeTab, fetchRules, fetchEvents])

  const getSeverityBadge = (severity: string) => {
    const badges: Record<string, { className: string; label: string }> = {
      CRITICAL: { className: 'bg-red-100 text-red-800', label: 'CRITICAL' },
      WARN: { className: 'bg-yellow-100 text-yellow-800', label: 'WARN' },
      INFO: { className: 'bg-blue-100 text-blue-800', label: 'INFO' },
    }
    const badge = badges[severity] || { className: 'bg-gray-100 text-gray-800', label: severity }
    return <span className={`px-2 py-1 text-xs font-semibold rounded ${badge.className}`}>{badge.label}</span>
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DAILY_SPIKE: 'Daily Spike',
      TOP_CONSUMER_SHARE: 'Top Consumer Share',
      CUR_STALE: 'CUR Stale',
      NO_BUDGETS: 'No Budgets',
      BUDGET_STATUS: 'Budget Status',
      MONTHLY_BUDGET: 'Monthly Budget',
    }
    return labels[type] || type
  }

  return (
    <div data-testid="alerts-page">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alerts</h2>
          <p className="text-sm text-gray-500 mt-1">Manage alert rules and view event history</p>
        </div>
        {activeTab === 'rules' && (
          <Link
            href="/alerts/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            data-testid="alerts-new-rule"
          >
            + New Rule
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="alerts-tab-rules"
          >
            Rules
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="alerts-tab-events"
          >
            Events
          </button>
        </nav>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div data-testid="alerts-rules">
          {rules.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">No alert rules configured.</p>
              <Link
                href="/alerts/new"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first rule →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white rounded-lg shadow p-6"
                  data-testid={`alerts-rule-${rule.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            rule.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rule.enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {getTypeLabel(rule.type)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {rule.type === 'DAILY_SPIKE' && rule.spikePercent && (
                          <p>
                            Alert when daily cost spikes by <span className="font-medium">{rule.spikePercent}%</span> vs{' '}
                            {rule.lookbackDays}-day baseline
                          </p>
                        )}
                        {rule.type === 'TOP_CONSUMER_SHARE' && rule.topSharePercent && (
                          <p>
                            Alert when top consumer exceeds <span className="font-medium">{rule.topSharePercent}%</span>{' '}
                            of MTD costs
                          </p>
                        )}
                        {rule.type === 'CUR_STALE' && <p>Alert when AWS CUR sync is stale (&gt;48h)</p>}
                        {rule.type === 'NO_BUDGETS' && <p>Alert when no budgets are configured</p>}
                        {rule.type === 'BUDGET_STATUS' && <p>Alert when budgets exceed thresholds</p>}
                        <p className="text-xs text-gray-500">
                          Cooldown: {rule.cooldownHours}h • Events: {rule._count.alertEvents}
                          {rule.lastTriggeredAt && (
                            <> • Last triggered: {new Date(rule.lastTriggeredAt).toLocaleString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => toggleRule(rule.id, rule.enabled)}
                        disabled={toggling === rule.id}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          rule.enabled
                            ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        } disabled:opacity-50`}
                        data-testid={`alerts-rule-toggle-${rule.id}`}
                      >
                        {toggling === rule.id ? '...' : rule.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <Link
                        href={`/alerts/${rule.id}/edit`}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        data-testid={`alerts-rule-edit-${rule.id}`}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="px-3 py-1 text-sm border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                        data-testid={`alerts-rule-delete-${rule.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div data-testid="alerts-events">
          {/* Filters */}
          <div className="mb-6 bg-white rounded-lg shadow p-4" data-testid="alerts-events-filters">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value as DateRange)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="last7">Last 7 days</option>
                  <option value="last30">Last 30 days</option>
                  <option value="mtd">Month to Date</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => {
                    setSeverity(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="WARN">Warning</option>
                  <option value="INFO">Info</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All</option>
                  <option value="DAILY_SPIKE">Daily Spike</option>
                  <option value="TOP_CONSUMER_SHARE">Top Consumer</option>
                  <option value="CUR_STALE">CUR Stale</option>
                  <option value="NO_BUDGETS">No Budgets</option>
                  <option value="BUDGET_STATUS">Budget Status</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="alerts-events-table">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No events found</p>
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
                          Rule
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Severity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50" data-testid={`alerts-event-${event.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(event.triggeredAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {event.alertRule.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getTypeLabel(event.alertRule.type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{getSeverityBadge(event.severity)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {event.amountEUR > 0 ? `€${event.amountEUR.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {event.message}
                            {event.metadata?.targetName && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({event.metadata.scopeType || 'ORG'}: {event.metadata.targetName})
                              </span>
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
                      {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}{' '}
                      events
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
      )}
    </div>
  )
}

