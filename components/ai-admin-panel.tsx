'use client'

import { useState } from 'react'
import FormattedDate from './formatted-date'

interface AiAdminPanelProps {
  orgId: string
  initialKeys: any[]
  initialPolicies: any[]
  recentRequests: any[]
}

export default function AiAdminPanel({
  orgId,
  initialKeys,
  initialPolicies,
  recentRequests,
}: AiAdminPanelProps) {
  const [keys, setKeys] = useState(initialKeys)
  const [policies, setPolicies] = useState(initialPolicies)
  const [requests, setRequests] = useState(recentRequests)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)

  const handleCreateKey = async () => {
    setLoading(true)
    setError(null)
    setNewKey(null)

    try {
      const res = await fetch('/api/ai/keys', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create key')
      }

      const data = await res.json()
      setNewKey(data.key.apiKey)
      // Refresh keys list
      const keysRes = await fetch('/api/ai/keys')
      const keysData = await keysRes.json()
      setKeys(keysData.keys)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this key?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/ai/keys/${keyId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete key')
      }

      // Refresh keys list
      const keysRes = await fetch('/api/ai/keys')
      const keysData = await keysRes.json()
      setKeys(keysData.keys)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      allowedModels: formData.get('allowedModels')?.toString().split(',').map((s) => s.trim()) || [],
      blockedModels: formData.get('blockedModels')?.toString().split(',').map((s) => s.trim()) || [],
      maxCostPerDayEur: formData.get('maxCostPerDayEur') || null,
      maxTokensPerReq: formData.get('maxTokensPerReq') || null,
      enabled: formData.get('enabled') === 'on',
    }

    try {
      const res = await fetch('/api/ai/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create policy')
      }

      const policyData = await res.json()
      setPolicies([policyData.policy, ...policies])
      e.currentTarget.reset()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestRequest = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          prompt: 'Say hello in one sentence.',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Test request failed')
      }

      const data = await res.json()
      const cost = data.estimatedCostEur ? Number(data.estimatedCostEur).toFixed(4) : '0.0000'
      alert(`Success! Response: ${data.content}\nCost: ${cost} EUR`)
      
      // Refresh requests
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {newKey && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p className="font-semibold">⚠️ Save this API key now - it will not be shown again:</p>
          <code className="block mt-2 p-2 bg-yellow-100 rounded">{newKey}</code>
        </div>
      )}

      {/* API Keys */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
          <button
            onClick={handleCreateKey}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            + Create Key
          </button>
        </div>
        <div className="px-6 py-4">
          {keys.length === 0 ? (
            <p className="text-gray-500 text-sm">No API keys created yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <code className="text-sm font-mono">{key.keyPrefix}...</code>
                    <span
                      className={`ml-2 px-2 py-1 text-xs rounded ${
                        key.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {key.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Created <FormattedDate date={key.createdAt} />
                    </p>
                  </div>
                  {key.status === 'active' && (
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      disabled={loading}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Policies */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Policies</h3>
        </div>
        <div className="px-6 py-4">
          <form onSubmit={handleCreatePolicy} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Production Policy"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Models (comma-separated)
                </label>
                <input
                  type="text"
                  name="allowedModels"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="gpt-4o, claude-3-5-sonnet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blocked Models (comma-separated)
                </label>
                <input
                  type="text"
                  name="blockedModels"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="gpt-4, o1-preview"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Cost/Day (EUR)
                </label>
                <input
                  type="number"
                  name="maxCostPerDayEur"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="100.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens/Request
                </label>
                <input
                  type="number"
                  name="maxTokensPerReq"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="10000"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" name="enabled" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-700">Enabled</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Policy
            </button>
          </form>

          {policies.length > 0 && (
            <div className="space-y-2">
              {policies.map((policy) => (
                <div key={policy.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{policy.name}</p>
                      <p className="text-xs text-gray-500">
                        {policy.enabled ? '✓ Enabled' : '✗ Disabled'}
                        {policy.maxCostPerDayEur && ` • Max: ${policy.maxCostPerDayEur} EUR/day`}
                        {policy.maxTokensPerReq && ` • Max: ${policy.maxTokensPerReq} tokens/req`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Test Request */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Test Request</h3>
          <button
            onClick={handleTestRequest}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Send Test Request
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500">
            Test the AI Gateway with a simple request. Uses model: gpt-4o-mini
          </p>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Requests</h3>
        </div>
        <div className="px-6 py-4">
          {requests.length === 0 ? (
            <p className="text-gray-500 text-sm">No requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Model</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tokens</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td className="px-4 py-2 text-sm">
                        <FormattedDate date={req.occurredAt} />
                      </td>
                      <td className="px-4 py-2 text-sm font-mono">{req.model}</td>
                      <td className="px-4 py-2 text-sm">{req.totalTokens?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {req.estimatedCostEur ? `${Number(req.estimatedCostEur).toFixed(4)} EUR` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            req.statusCode === 200
                              ? 'bg-green-100 text-green-800'
                              : req.statusCode === 403
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {req.statusCode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

