'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingStepDirectoryProps {
  organizationId: string
  onComplete: () => void
}

export default function OnboardingStepDirectory({
  organizationId,
  onComplete,
}: OnboardingStepDirectoryProps) {
  const router = useRouter()
  const [appName, setAppName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [clientName, setClientName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<{
    apps: number
    projects: number
    clients: number
    teams: number
  }>({ apps: 0, projects: 0, clients: 0, teams: 0 })

  // Check current status
  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const [appsRes, projectsRes, clientsRes, teamsRes] = await Promise.all([
        fetch('/api/directory/apps'),
        fetch('/api/directory/projects'),
        fetch('/api/directory/clients'),
        fetch('/api/directory/teams'),
      ])

      const apps = await appsRes.json()
      const projects = await projectsRes.json()
      const clients = await clientsRes.json()
      const teams = await teamsRes.json()

      setStatus({
        apps: apps.apps?.length || 0,
        projects: projects.projects?.length || 0,
        clients: clients.clients?.length || 0,
        teams: teams.teams?.length || 0,
      })

      // Auto-complete if requirements met
      if (
        (apps.apps?.length || 0) >= 1 &&
        (projects.projects?.length || 0) >= 1 &&
        (clients.clients?.length || 0) >= 1
      ) {
        onComplete()
      }
    } catch (err) {
      console.error('Error checking status:', err)
    }
  }

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appName.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/directory/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: appName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create app')
      }

      setAppName('')
      await checkStatus()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create app')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/directory/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }

      setProjectName('')
      await checkStatus()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/directory/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clientName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create client')
      }

      setClientName('')
      await checkStatus()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/directory/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create team')
      }

      setTeamName('')
      await checkStatus()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  const canContinue =
    status.apps >= 1 && status.projects >= 1 && status.clients >= 1

  return (
    <div data-testid="onboarding-step-1">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 1: Directory</h2>
      <p className="text-gray-600 mb-6">
        Create at least 1 App, 1 Project, and 1 Client. Teams are optional.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Apps:</span>{' '}
              <span className={status.apps >= 1 ? 'text-green-600' : 'text-gray-600'}>
                {status.apps} {status.apps >= 1 ? '✓' : ''}
              </span>
            </div>
            <div>
              <span className="font-medium">Projects:</span>{' '}
              <span className={status.projects >= 1 ? 'text-green-600' : 'text-gray-600'}>
                {status.projects} {status.projects >= 1 ? '✓' : ''}
              </span>
            </div>
            <div>
              <span className="font-medium">Clients:</span>{' '}
              <span className={status.clients >= 1 ? 'text-green-600' : 'text-gray-600'}>
                {status.clients} {status.clients >= 1 ? '✓' : ''}
              </span>
            </div>
            <div>
              <span className="font-medium">Teams:</span>{' '}
              <span className="text-gray-600">{status.teams} (optional)</span>
            </div>
          </div>
        </div>

        {/* Create App */}
        <form onSubmit={handleCreateApp} className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Create App</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="App name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading || !appName.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>

        {/* Create Project */}
        <form onSubmit={handleCreateProject} className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Create Project</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading || !projectName.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>

        {/* Create Client */}
        <form onSubmit={handleCreateClient} className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Create Client</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading || !clientName.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>

        {/* Create Team (optional) */}
        <form onSubmit={handleCreateTeam} className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Create Team (Optional)</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onComplete}
          disabled={!canContinue}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

