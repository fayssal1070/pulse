'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Plus, RotateCcw, Trash2, Edit2 } from 'lucide-react'
import { Toast, useToast } from '@/components/toast'

interface ApiKey {
  id: string
  label: string | null
  keyPrefix: string
  status: string
  enabled: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  defaultApp?: { name: string } | null
  defaultProject?: { name: string } | null
  defaultClient?: { name: string } | null
  defaultTeam?: { name: string } | null
  rateLimitRpm: number | null
  dailyCostLimitEur: number | null
  monthlyCostLimitEur: number | null
  createdByUserId: string
}

interface Directory {
  apps: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  teams: Array<{ id: string; name: string }>
}

interface ApiKeysAdminClientProps {
  organizationId: string
  canRotateAny: boolean
  directory: Directory
}

export default function ApiKeysAdminClient({ organizationId, canRotateAny, directory }: ApiKeysAdminClientProps) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useToast()

  // Create form state
  const [formData, setFormData] = useState({
    label: '',
    defaultAppId: '',
    defaultProjectId: '',
    defaultClientId: '',
    defaultTeamId: '',
    allowedModels: '',
    blockedModels: '',
    requireAttribution: null as boolean | null,
    rateLimitRpm: '',
    dailyCostLimitEur: '',
    monthlyCostLimitEur: '',
    expiresAt: '',
  })

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      const res = await fetch('/api/admin/api-keys')
      if (!res.ok) throw new Error('Failed to load keys')
      const data = await res.json()
      setKeys(data.keys || [])
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const payload: any = {}
      if (formData.label) payload.label = formData.label
      if (formData.defaultAppId) payload.defaultAppId = formData.defaultAppId
      if (formData.defaultProjectId) payload.defaultProjectId = formData.defaultProjectId
      if (formData.defaultClientId) payload.defaultClientId = formData.defaultClientId
      if (formData.defaultTeamId) payload.defaultTeamId = formData.defaultTeamId
      if (formData.allowedModels) payload.allowedModels = formData.allowedModels.split(',').map((m) => m.trim()).filter(Boolean)
      if (formData.blockedModels) payload.blockedModels = formData.blockedModels.split(',').map((m) => m.trim()).filter(Boolean)
      if (formData.requireAttribution !== null) payload.requireAttribution = formData.requireAttribution
      if (formData.rateLimitRpm) payload.rateLimitRpm = parseInt(formData.rateLimitRpm)
      if (formData.dailyCostLimitEur) payload.dailyCostLimitEur = parseFloat(formData.dailyCostLimitEur)
      if (formData.monthlyCostLimitEur) payload.monthlyCostLimitEur = parseFloat(formData.monthlyCostLimitEur)
      if (formData.expiresAt) payload.expiresAt = formData.expiresAt

      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create key')

      // Show secret once
      const secretToCopy = data.key.secret
      navigator.clipboard.writeText(secretToCopy)
      showToast('API key created! Secret copied to clipboard. Save it now - it will not be shown again.', 'success')

      setShowCreateModal(false)
      setFormData({
        label: '',
        defaultAppId: '',
        defaultProjectId: '',
        defaultClientId: '',
        defaultTeamId: '',
        allowedModels: '',
        blockedModels: '',
        requireAttribution: null,
        rateLimitRpm: '',
        dailyCostLimitEur: '',
        monthlyCostLimitEur: '',
        expiresAt: '',
      })
      loadKeys()
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error')
    }
  }

  const handleRotate = async (keyId: string) => {
    if (!confirm('Rotate this API key? The old key will stop working immediately.')) return

    try {
      const res = await fetch(`/api/admin/api-keys/${keyId}/rotate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rotate key')

      const secretToCopy = data.key.secret
      navigator.clipboard.writeText(secretToCopy)
      showToast('Key rotated! New secret copied to clipboard. Save it now.', 'success')
      loadKeys()
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error')
    }
  }

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return

    try {
      const res = await fetch(`/api/admin/api-keys/${keyId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke key')
      showToast('Key revoked successfully', 'success')
      loadKeys()
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error')
    }
  }

  const copyPrefix = (prefix: string, keyId: string) => {
    navigator.clipboard.writeText(prefix)
    setCopiedId(keyId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return <div className="text-center py-8">Loading API keys...</div>
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Manage API keys for accessing Pulse AI Gateway</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          data-testid="create-api-key-button"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="My Production Key"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default App</label>
                  <select
                    value={formData.defaultAppId}
                    onChange={(e) => setFormData({ ...formData, defaultAppId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">None</option>
                    {directory.apps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Project</label>
                  <select
                    value={formData.defaultProjectId}
                    onChange={(e) => setFormData({ ...formData, defaultProjectId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">None</option>
                    {directory.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Models (comma-separated, optional)</label>
                <input
                  type="text"
                  value={formData.allowedModels}
                  onChange={(e) => setFormData({ ...formData, allowedModels: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="gpt-4, gpt-3.5-turbo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (requests/min, optional)</label>
                <input
                  type="number"
                  value={formData.rateLimitRpm}
                  onChange={(e) => setFormData({ ...formData, rateLimitRpm: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="60"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  data-testid="create-key-submit"
                >
                  Create
                </button>
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label / Prefix</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Defaults</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No API keys yet. Create one to get started.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} data-testid={`api-key-row-${key.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{key.label || 'Unnamed'}</div>
                    <div className="text-sm text-gray-500 font-mono flex items-center gap-2">
                      {key.keyPrefix}...
                      <button
                        onClick={() => copyPrefix(key.keyPrefix, key.id)}
                        className="text-gray-400 hover:text-gray-600"
                        data-testid={`copy-prefix-${key.id}`}
                      >
                        {copiedId === key.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        key.status === 'active' && key.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {key.status === 'active' && key.enabled ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {key.defaultApp?.name || key.defaultProject?.name || key.defaultTeam?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {key.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleRotate(key.id)}
                          className="text-blue-600 hover:text-blue-900"
                          data-testid={`rotate-key-${key.id}`}
                        >
                          <RotateCcw className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="text-red-600 hover:text-red-900"
                          data-testid={`revoke-key-${key.id}`}
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

