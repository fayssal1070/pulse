'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AiProviderConnection {
  id: string
  provider: string
  name: string
  status: string
  keyLast4: string
  createdAt: string
  updatedAt: string
}

interface AiModelRoute {
  id: string
  provider: string
  model: string
  enabled: boolean
  priority: number
  maxCostPerReqEUR: number | null
  createdAt: string
  updatedAt: string
}

interface AiProvidersAdminClientProps {
  organizationId: string
}

const COMMON_MODELS = {
  OPENAI: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
  ANTHROPIC: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20240620'],
  XAI: ['grok-beta', 'grok-2'],
  GOOGLE: ['gemini-pro', 'gemini-ultra', 'gemini-1.5-pro'],
  MISTRAL: ['mistral-large', 'mistral-medium', 'mistral-small', 'mistral-tiny'],
}

export default function AiProvidersAdminClient({ organizationId }: AiProvidersAdminClientProps) {
  const router = useRouter()
  const [connections, setConnections] = useState<AiProviderConnection[]>([])
  const [routes, setRoutes] = useState<AiModelRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [showAddProvider, setShowAddProvider] = useState(false)
  const [providerForm, setProviderForm] = useState({
    provider: 'OPENAI',
    name: '',
    apiKey: '',
  })

  const [showAddRoute, setShowAddRoute] = useState(false)
  const [routeForm, setRouteForm] = useState({
    provider: 'OPENAI',
    model: '',
    priority: 100,
    enabled: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [providersRes, routesRes] = await Promise.all([
        fetch('/api/admin/ai/providers'),
        fetch('/api/admin/ai/routes'),
      ])

      const providersData = await providersRes.json()
      const routesData = await routesRes.json()

      setConnections(providersData.connections || [])
      setRoutes(routesData.routes || [])
    } catch (error) {
      showToast('error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('success', 'Provider connection created')
        setProviderForm({ provider: 'OPENAI', name: '', apiKey: '' })
        setShowAddProvider(false)
        loadData()
        router.refresh()
      } else {
        showToast('error', data.error || 'Failed to create provider')
      }
    } catch (error) {
      showToast('error', 'Failed to create provider')
    }
  }

  const handleTestProvider = async (connectionId: string) => {
    try {
      const res = await fetch('/api/admin/ai/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerConnectionId: connectionId }),
      })

      const data = await res.json()
      if (data.ok) {
        showToast('success', `Provider test successful (${data.latencyMs}ms)`)
      } else {
        showToast('error', data.error || 'Provider test failed')
      }
    } catch (error) {
      showToast('error', 'Failed to test provider')
    }
  }

  const handleToggleProviderStatus = async (id: string, currentStatus: string) => {
    try {
      const res = await fetch(`/api/admin/ai/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }),
      })

      if (res.ok) {
        showToast('success', 'Provider status updated')
        loadData()
        router.refresh()
      } else {
        const data = await res.json()
        showToast('error', data.error || 'Failed to update provider')
      }
    } catch (error) {
      showToast('error', 'Failed to update provider')
    }
  }

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider connection?')) return

    try {
      const res = await fetch(`/api/admin/ai/providers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('success', 'Provider deleted')
        loadData()
        router.refresh()
      } else {
        const data = await res.json()
        showToast('error', data.error || 'Failed to delete provider')
      }
    } catch (error) {
      showToast('error', 'Failed to delete provider')
    }
  }

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/ai/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeForm),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('success', 'Model route created')
        setRouteForm({ provider: 'OPENAI', model: '', priority: 100, enabled: true })
        setShowAddRoute(false)
        loadData()
        router.refresh()
      } else {
        showToast('error', data.error || 'Failed to create route')
      }
    } catch (error) {
      showToast('error', 'Failed to create route')
    }
  }

  const handleAddCommonModels = async (provider: string) => {
    const models = COMMON_MODELS[provider as keyof typeof COMMON_MODELS] || []
    
    for (const model of models) {
      try {
        await fetch('/api/admin/ai/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            model,
            priority: 100,
            enabled: true,
          }),
        })
      } catch (error) {
        console.error(`Failed to add model ${model}:`, error)
      }
    }

    showToast('success', `Added ${models.length} common models for ${provider}`)
    loadData()
    router.refresh()
  }

  const handleToggleRoute = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/ai/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      })

      if (res.ok) {
        showToast('success', 'Route updated')
        loadData()
        router.refresh()
      } else {
        const data = await res.json()
        showToast('error', data.error || 'Failed to update route')
      }
    } catch (error) {
      showToast('error', 'Failed to update route')
    }
  }

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return

    try {
      const res = await fetch(`/api/admin/ai/routes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('success', 'Route deleted')
        loadData()
        router.refresh()
      } else {
        const data = await res.json()
        showToast('error', data.error || 'Failed to delete route')
      }
    } catch (error) {
      showToast('error', 'Failed to delete route')
    }
  }

  const activeConnections = connections.filter((c) => c.status === 'ACTIVE')
  const hasActiveConnections = activeConnections.length > 0

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`p-4 rounded-lg ${
            toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Connect Provider Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Connect Provider</h2>
          <button
            onClick={() => setShowAddProvider(!showAddProvider)}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
          >
            {showAddProvider ? 'Cancel' : '+ Add Provider'}
          </button>
        </div>

        {showAddProvider && (
          <form onSubmit={handleAddProvider} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={providerForm.provider}
                  onChange={(e) => setProviderForm({ ...providerForm, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="OPENAI">OpenAI</option>
                  <option value="ANTHROPIC">Anthropic</option>
                  <option value="XAI">xAI</option>
                  <option value="GOOGLE">Google</option>
                  <option value="MISTRAL">Mistral</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  placeholder="e.g., OpenAI Prod"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={providerForm.apiKey}
                  onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
              >
                Save & Test
              </button>
            </div>
          </form>
        )}

        {/* Providers List */}
        {!loading && connections.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Connected Providers</h3>
            <div className="space-y-2">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{conn.provider}</span>
                    <span className="text-sm text-gray-600">{conn.name}</span>
                    <span className="text-xs text-gray-500">...{conn.keyLast4}</span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        conn.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {conn.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestProvider(conn.id)}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleToggleProviderStatus(conn.id, conn.status)}
                      className="px-3 py-1 text-sm bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
                    >
                      {conn.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteProvider(conn.id)}
                      className="px-3 py-1 text-sm bg-red-200 text-red-800 rounded hover:bg-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Model Routes Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Model Routes</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddRoute(!showAddRoute)}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
            >
              {showAddRoute ? 'Cancel' : '+ Add Route'}
            </button>
          </div>
        </div>

        {showAddRoute && (
          <form onSubmit={handleAddRoute} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={routeForm.provider}
                  onChange={(e) => setRouteForm({ ...routeForm, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {['OPENAI', 'ANTHROPIC', 'XAI', 'GOOGLE', 'MISTRAL'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={routeForm.model}
                  onChange={(e) => setRouteForm({ ...routeForm, model: e.target.value })}
                  placeholder="e.g., gpt-4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  value={routeForm.priority}
                  onChange={(e) => setRouteForm({ ...routeForm, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={routeForm.enabled}
                    onChange={(e) => setRouteForm({ ...routeForm, enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
              >
                Add Route
              </button>
            </div>
          </form>
        )}

        {/* Presets */}
        {hasActiveConnections && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Quick add common models:</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(COMMON_MODELS).map((provider) => {
                const hasProvider = activeConnections.some((c) => c.provider === provider)
                if (!hasProvider) return null
                return (
                  <button
                    key={provider}
                    onClick={() => handleAddCommonModels(provider)}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Add {provider} models
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Routes Table */}
        {!loading && routes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {routes.map((route) => (
                  <tr key={route.id}>
                    <td className="px-4 py-3 text-sm">{route.provider}</td>
                    <td className="px-4 py-3 text-sm font-mono">{route.model}</td>
                    <td className="px-4 py-3 text-sm">{route.priority}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          route.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {route.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleRoute(route.id, route.enabled)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {route.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && routes.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No model routes configured yet.</p>
        )}
      </div>

      {/* SDK Snippets */}
      {hasActiveConnections && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SDK Snippets</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">cURL</h3>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {`curl -X POST https://your-domain.com/api/ai/request \\
  -H "Content-Type: application/json" \\
  -H "x-pulse-app: your-app-id" \\
  -H "x-pulse-project: your-project-id" \\
  -H "x-pulse-client: your-client-id" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Node.js</h3>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {`const response = await fetch('https://your-domain.com/api/ai/request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-pulse-app': 'your-app-id',
    'x-pulse-project': 'your-project-id',
    'x-pulse-client': 'your-client-id',
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }]
  })
});`}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Python</h3>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {`import requests

response = requests.post(
    'https://your-domain.com/api/ai/request',
    headers={
        'Content-Type': 'application/json',
        'x-pulse-app': 'your-app-id',
        'x-pulse-project': 'your-project-id',
        'x-pulse-client': 'your-client-id',
    },
    json={
        'model': 'gpt-4',
        'messages': [{'role': 'user', 'content': 'Hello'}]
    }
)`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

