'use client'

import { useState, useEffect } from 'react'
import FormattedDate from '@/components/formatted-date'

interface AiLog {
  id: string
  occurredAt: string
  userId: string | null
  teamId: string | null
  projectId: string | null
  appId: string | null
  clientId: string | null
  provider: string | null
  model: string | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  estimatedCostEur: number | null
  latencyMs: number | null
  statusCode: number | null
  promptHash: string | null
  rawRef: any
}

interface AiLogsResponse {
  logs: AiLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AiLogsClient({ orgId }: { orgId: string }) {
  const [logs, setLogs] = useState<AiLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    model: '',
    status: '',
  })

  const fetchLogs = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
    })

    try {
      const res = await fetch(`/api/logs/ai?${params}`)
      const data: AiLogsResponse = await res.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  const handleExport = () => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
    )
    window.open(`/api/exports/ai-logs.csv?${params}`, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={filters.model}
              onChange={(e) => setFilters({ ...filters, model: e.target.value })}
              placeholder="gpt-4o-mini"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="blocked">Blocked</option>
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
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tokens</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Latency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <FormattedDate date={log.occurredAt} />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{log.model || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {log.totalTokens?.toLocaleString() || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.estimatedCostEur ? `${log.estimatedCostEur.toFixed(4)} EUR` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.latencyMs ? `${log.latencyMs}ms` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            log.statusCode === 200
                              ? 'bg-green-100 text-green-800'
                              : log.statusCode === 403
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.statusCode || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {pagination.totalPages > 1 && (
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

