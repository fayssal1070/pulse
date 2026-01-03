'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface DirectoryStats {
  teamsCount: number
  projectsCount: number
  appsCount: number
  clientsCount: number
  hasRequireAttribution: boolean
}

export default function OnboardingWarning() {
  const [stats, setStats] = useState<DirectoryStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [teamsRes, projectsRes, appsRes, clientsRes, policiesRes] = await Promise.all([
          fetch('/api/directory/teams'),
          fetch('/api/directory/projects'),
          fetch('/api/directory/apps'),
          fetch('/api/directory/clients'),
          fetch('/api/ai/policies').catch(() => null),
        ])

        const teams = teamsRes.ok ? (await teamsRes.json()).teams || [] : []
        const projects = projectsRes.ok ? (await projectsRes.json()).projects || [] : []
        const apps = appsRes.ok ? (await appsRes.json()).apps || [] : []
        const clients = clientsRes.ok ? (await clientsRes.json()).clients || [] : []
        
        let hasRequireAttribution = false
        if (policiesRes && policiesRes.ok) {
          const policies = await policiesRes.json()
          hasRequireAttribution = policies.policies?.some((p: any) => p.enabled && p.requireAttribution) || false
        }

        setStats({
          teamsCount: teams.length,
          projectsCount: projects.length,
          appsCount: apps.length,
          clientsCount: clients.length,
          hasRequireAttribution,
        })
      } catch (error) {
        console.error('Error fetching directory stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading || !stats) {
    return null
  }

  // Show warning if no Apps OR no Projects OR no Clients (Apps is critical)
  const needsSetup = stats.appsCount === 0 || stats.projectsCount === 0 || stats.clientsCount === 0

  if (!needsSetup && !stats.hasRequireAttribution) {
    return null
  }

  return (
    <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4" data-testid="directory-onboarding-warning">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Setup Required</h3>
          <div className="mt-2 text-sm text-yellow-700">
            {stats.appsCount === 0 && (
              <p className="mb-2">
                <strong>No Apps configured.</strong> Set up dimensions to unlock cost tracking and attribution.
              </p>
            )}
            {stats.projectsCount === 0 && <p className="mb-2">No Projects configured.</p>}
            {stats.clientsCount === 0 && <p className="mb-2">No Clients configured.</p>}
            {stats.hasRequireAttribution && stats.appsCount === 0 && (
              <p className="mb-2 font-semibold">
                ⚠️ Requests will fail until you create at least one App (requireAttribution policy is active).
              </p>
            )}
          </div>
          <div className="mt-4">
            <div className="flex space-x-3">
              <Link
                href="/directory"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                data-testid="directory-warning-cta"
              >
                Go to Directory
              </Link>
              {stats.appsCount === 0 && (
                <Link
                  href="/directory?tab=apps"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  data-testid="directory-warning-create-app"
                >
                  Create first App
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
