'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { computeBudgetStatus } from '@/lib/alerts/engine'

interface Budget {
  id: string
  name: string
  scopeType: string
  scopeId: string | null
  period: string
  amountEur: number
  alertThresholdPct: number
  hardLimit: boolean
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface BudgetsListProps {
  orgId: string
}

export default function BudgetsList({ orgId }: BudgetsListProps) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchBudgets()
  }, [orgId])

  const fetchBudgets = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/budgets')
      if (!res.ok) {
        throw new Error('Failed to fetch budgets')
      }
      const data = await res.json()
      setBudgets(data.budgets || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) {
      return
    }

    try {
      const res = await fetch(`/api/budgets/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to delete budget')
      }
      fetchBudgets()
    } catch (err: any) {
      alert(err.message)
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

  if (loading) {
    return <div className="text-center py-8">Loading budgets...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Budgets</h2>
          <p className="text-sm text-gray-500 mt-1">Manage spending limits and alerts</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create Budget
        </button>
      </div>

      {showCreateForm && (
        <CreateBudgetForm
          orgId={orgId}
          onSuccess={() => {
            setShowCreateForm(false)
            fetchBudgets()
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {budgets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No budgets configured</p>
          <p className="text-sm text-gray-400 mt-2">Create a budget to track spending and receive alerts</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgets.map((budget) => (
                <BudgetRow key={budget.id} budget={budget} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BudgetRow({
  budget,
  onDelete,
}: {
  budget: Budget
  onDelete: (id: string) => void
}) {
  const [status, setStatus] = useState<{ percentage: number; status: string } | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // We'll compute status client-side for now (or use API endpoint)
        // For MVP, we'll show basic info
        setLoadingStatus(false)
      } catch (error) {
        setLoadingStatus(false)
      }
    }
    fetchStatus()
  }, [budget.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{budget.name}</div>
        {!budget.enabled && (
          <div className="text-xs text-gray-500">Disabled</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{budget.scopeType}</div>
        {budget.scopeId && (
          <div className="text-xs text-gray-500">{budget.scopeId}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {budget.period}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
        {formatCurrency(Number(budget.amountEur))}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {loadingStatus ? (
          <span className="text-xs text-gray-400">Loading...</span>
        ) : (
          <span className="text-xs text-gray-500">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={() => onDelete(budget.id)}
          className="text-red-600 hover:text-red-900"
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

function CreateBudgetForm({
  orgId,
  onSuccess,
  onCancel,
}: {
  orgId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    scopeType: 'ORG' as 'ORG' | 'TEAM' | 'PROJECT' | 'APP' | 'CLIENT',
    scopeId: '',
    period: 'MONTHLY' as 'MONTHLY' | 'DAILY',
    amountEur: '',
    alertThresholdPct: '80',
    hardLimit: false,
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Directory entities for dropdowns
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [apps, setApps] = useState<Array<{ id: string; name: string }>>([])
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [loadingDirectory, setLoadingDirectory] = useState(false)

  useEffect(() => {
    async function fetchDirectory() {
      setLoadingDirectory(true)
      try {
        const [teamsRes, projectsRes, appsRes, clientsRes] = await Promise.all([
          fetch('/api/directory/teams'),
          fetch('/api/directory/projects'),
          fetch('/api/directory/apps'),
          fetch('/api/directory/clients'),
        ])

        if (teamsRes.ok) {
          const data = await teamsRes.json()
          setTeams(data.teams || [])
        }
        if (projectsRes.ok) {
          const data = await projectsRes.json()
          setProjects(data.projects || [])
        }
        if (appsRes.ok) {
          const data = await appsRes.json()
          setApps(data.apps || [])
        }
        if (clientsRes.ok) {
          const data = await clientsRes.json()
          setClients(data.clients || [])
        }
      } catch (error) {
        console.error('Error fetching directory:', error)
      } finally {
        setLoadingDirectory(false)
      }
    }

    fetchDirectory()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amountEur: parseFloat(formData.amountEur),
          alertThresholdPct: parseInt(formData.alertThresholdPct),
          scopeId: formData.scopeType === 'ORG' ? null : formData.scopeId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create budget')
      }

      onSuccess()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Budget</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Scope Type</label>
            <select
              value={formData.scopeType}
              onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any, scopeId: '' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              data-testid="budget-scope"
            >
              <option value="ORG">Organization</option>
              <option value="TEAM">Team</option>
              <option value="PROJECT">Project</option>
              <option value="APP">App</option>
              <option value="CLIENT">Client</option>
            </select>
          </div>
          {formData.scopeType !== 'ORG' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {formData.scopeType === 'APP' ? 'App' : formData.scopeType === 'PROJECT' ? 'Project' : formData.scopeType === 'CLIENT' ? 'Client' : 'Team'}
              </label>
              {formData.scopeType === 'APP' && (
                <select
                  required
                  value={formData.scopeId}
                  onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  data-testid="budget-select-app"
                >
                  <option value="">Select App</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
                </select>
              )}
              {formData.scopeType === 'PROJECT' && (
                <select
                  required
                  value={formData.scopeId}
                  onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  data-testid="budget-select-project"
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
              {formData.scopeType === 'CLIENT' && (
                <select
                  required
                  value={formData.scopeId}
                  onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  data-testid="budget-select-client"
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              )}
              {formData.scopeType === 'TEAM' && (
                <select
                  required
                  value={formData.scopeId}
                  onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  data-testid="budget-select-team"
                >
                  <option value="">Select Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Period</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="DAILY">Daily</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (EUR)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amountEur}
              onChange={(e) => setFormData({ ...formData, amountEur: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Alert Threshold (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.alertThresholdPct}
              onChange={(e) => setFormData({ ...formData, alertThresholdPct: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              checked={formData.hardLimit}
              onChange={(e) => setFormData({ ...formData, hardLimit: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">Hard Limit (block when exceeded)</label>
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Budget'}
          </button>
        </div>
      </form>
    </div>
  )
}

