'use client'

import { useState, useEffect } from 'react'
import FormattedDate from '@/components/formatted-date'

interface CostEvent {
  id: string
  occurredAt: string
  source: string
  provider: string | null
  service: string | null
  amountEur: number
  amountUsd: number | null
  currency: string
  dimensions: any
}

interface CostsResponse {
  events?: CostEvent[]
  results?: any[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  total?: number
}

export default function CostsClient({ orgId }: { orgId: string }) {
  const [data, setData] = useState<CostEvent[] | any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({
    source: '',
    provider: '',
    startDate: '',
    endDate: '',
  })
  const [groupBy, setGroupBy] = useState('')

  const fetchCosts = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '50',
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
    })
    if (groupBy) {
      params.set('groupBy', groupBy)
    }

    try {
      const res = await fetch(`/api/costs?${params}`)
      const response: CostsResponse = await res.json()
      if (response.results) {
        setData(response.results)
        setPagination({ page: 1, limit: 50, total: response.total || 0, totalPages: 1 })
      } else {
        setData(response.events || [])
        setPagination(response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 })
      }
    } catch (error) {
      console.error('Error fetching costs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCosts()
  }, [page, filters, groupBy])

  const handleExport = () => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
    )
    window.open(`/api/exports/cost-events.csv?${params}`, '_blank')
  }

  const isGrouped = !!groupBy

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              <option value="AWS">AWS</option>
              <option value="AI">AI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <input
              type="text"
              value={filters.provider}
              onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
              placeholder="aws, openai"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">None</option>
              <option value="day">Day</option>
              <option value="source">Source</option>
              <option value="provider">Provider</option>
              <option value="service">Service</option>
              <option value="model">Model</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No costs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {isGrouped ? (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Group
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Amount (EUR)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Count
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Source
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Provider
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Service
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                          Amount (EUR)
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, idx) => (
                    <tr key={isGrouped ? idx : item.id} className="hover:bg-gray-50">
                      {isGrouped ? (
                        <>
                          <td className="px-4 py-3 text-sm">
                            {Object.entries(item)
                              .filter(([k]) => !['amountEur', 'amountUsd', 'count'].includes(k))
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            {Number(item.amountEur).toFixed(2)} EUR
                          </td>
                          <td className="px-4 py-3 text-sm">{item.count}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm">
                            <FormattedDate date={item.occurredAt} />
                          </td>
                          <td className="px-4 py-3 text-sm">{item.source}</td>
                          <td className="px-4 py-3 text-sm">{item.provider || '-'}</td>
                          <td className="px-4 py-3 text-sm">{item.service || '-'}</td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            {Number(item.amountEur).toFixed(2)} EUR
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination (only if not grouped) */}
            {!isGrouped && pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
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
  )
}

