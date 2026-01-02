'use client'

import { useState, useEffect, useCallback } from 'react'
import { canManageDirectory } from '@/lib/auth/rbac'

interface Team {
  id: string
  name: string
  createdAt: string
}

interface Project {
  id: string
  name: string
  createdAt: string
}

interface App {
  id: string
  name: string
  slug: string
  createdAt: string
}

interface Client {
  id: string
  name: string
  externalId: string | null
  createdAt: string
}

type TabType = 'teams' | 'projects' | 'apps' | 'clients'

export default function DirectoryClient() {
  const [activeTab, setActiveTab] = useState<TabType>('teams')
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [apps, setApps] = useState<App[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editExternalId, setEditExternalId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newExternalId, setNewExternalId] = useState('')

  // Check permissions
  useEffect(() => {
    // For now, assume can manage (will be checked server-side in API)
    setCanManage(true)
  }, [])

  const fetchData = useCallback(async (tab: TabType) => {
    setLoading(true)
    try {
      let endpoint = ''
      if (tab === 'teams') endpoint = '/api/directory/teams'
      else if (tab === 'projects') endpoint = '/api/directory/projects'
      else if (tab === 'apps') endpoint = '/api/directory/apps'
      else if (tab === 'clients') endpoint = '/api/directory/clients'

      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        if (tab === 'teams') setTeams(data.teams || [])
        else if (tab === 'projects') setProjects(data.projects || [])
        else if (tab === 'apps') setApps(data.apps || [])
        else if (tab === 'clients') setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error fetching directory:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab, fetchData])

  const handleCreate = async () => {
    if (!newName.trim()) return

    try {
      let endpoint = ''
      let body: any = { name: newName.trim() }

      if (activeTab === 'teams') endpoint = '/api/directory/teams'
      else if (activeTab === 'projects') endpoint = '/api/directory/projects'
      else if (activeTab === 'apps') {
        endpoint = '/api/directory/apps'
        if (newSlug.trim()) body.slug = newSlug.trim()
      } else if (activeTab === 'clients') {
        endpoint = '/api/directory/clients'
        if (newExternalId.trim()) body.externalId = newExternalId.trim()
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setNewName('')
        setNewSlug('')
        setNewExternalId('')
        setShowCreate(false)
        await fetchData(activeTab)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to create')
      }
    } catch (error) {
      console.error('Error creating:', error)
      alert('Failed to create')
    }
  }

  const handleEdit = (item: Team | Project | App | Client) => {
    setEditingId(item.id)
    setEditName(item.name)
    if (activeTab === 'apps' && 'slug' in item) setEditSlug((item as App).slug)
    if (activeTab === 'clients' && 'externalId' in item) setEditExternalId((item as Client).externalId || '')
  }

  const handleSave = async () => {
    if (!editingId || !editName.trim()) return

    try {
      let endpoint = ''
      let body: any = { name: editName.trim() }

      if (activeTab === 'teams') endpoint = `/api/directory/teams/${editingId}`
      else if (activeTab === 'projects') endpoint = `/api/directory/projects/${editingId}`
      else if (activeTab === 'apps') {
        endpoint = `/api/directory/apps/${editingId}`
        if (editSlug.trim()) body.slug = editSlug.trim()
      } else if (activeTab === 'clients') {
        endpoint = `/api/directory/clients/${editingId}`
        body.externalId = editExternalId.trim() || null
      }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setEditingId(null)
        setEditName('')
        setEditSlug('')
        setEditExternalId('')
        await fetchData(activeTab)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update')
      }
    } catch (error) {
      console.error('Error updating:', error)
      alert('Failed to update')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      let endpoint = ''
      if (activeTab === 'teams') endpoint = `/api/directory/teams/${id}`
      else if (activeTab === 'projects') endpoint = `/api/directory/projects/${id}`
      else if (activeTab === 'apps') endpoint = `/api/directory/apps/${id}`
      else if (activeTab === 'clients') endpoint = `/api/directory/clients/${id}`

      const response = await fetch(endpoint, { method: 'DELETE' })

      if (response.ok) {
        await fetchData(activeTab)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete')
    }
  }

  const currentItems = activeTab === 'teams' ? teams : activeTab === 'projects' ? projects : activeTab === 'apps' ? apps : clients

  return (
    <div data-testid="directory-page">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Directory</h2>
          <p className="text-sm text-gray-500 mt-1">Manage Teams, Projects, Apps, and Clients</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            data-testid="directory-create-button"
          >
            + New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['teams', 'projects', 'apps', 'clients'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid={`directory-tab-${tab}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Create Form */}
      {showCreate && canManage && (
        <div className="mb-6 bg-white rounded-lg shadow p-4" data-testid="directory-create-form">
          <h3 className="text-lg font-semibold mb-4">Create {activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                data-testid="directory-create-name"
              />
            </div>
            {activeTab === 'apps' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (optional)</label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="auto-generated from name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  data-testid="directory-create-slug"
                />
              </div>
            )}
            {activeTab === 'clients' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External ID (optional)</label>
                <input
                  type="text"
                  value={newExternalId}
                  onChange={(e) => setNewExternalId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  data-testid="directory-create-external-id"
                />
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                data-testid="directory-create-submit"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreate(false)
                  setNewName('')
                  setNewSlug('')
                  setNewExternalId('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden" data-testid={`directory-${activeTab}-list`}>
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">No {activeTab} found. Create your first one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  {activeTab === 'apps' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                  )}
                  {activeTab === 'clients' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">External ID</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  {canManage && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50" data-testid={`directory-${activeTab}-item-${item.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          data-testid={`directory-edit-name-${item.id}`}
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      )}
                    </td>
                    {activeTab === 'apps' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            data-testid={`directory-edit-slug-${item.id}`}
                          />
                        ) : (
                          <div className="text-sm text-gray-500">{(item as App).slug}</div>
                        )}
                      </td>
                    )}
                    {activeTab === 'clients' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editExternalId}
                            onChange={(e) => setEditExternalId(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            data-testid={`directory-edit-external-id-${item.id}`}
                          />
                        ) : (
                          <div className="text-sm text-gray-500">{(item as Client).externalId || '-'}</div>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingId === item.id ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={handleSave}
                              className="text-blue-600 hover:text-blue-900"
                              data-testid={`directory-save-${item.id}`}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setEditName('')
                                setEditSlug('')
                                setEditExternalId('')
                              }}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-900"
                              data-testid={`directory-edit-${item.id}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                              data-testid={`directory-delete-${item.id}`}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

