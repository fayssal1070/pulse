'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import OrgSwitcher from './org-switcher'
import LogoutButton from './logout-button'
import BuildInfoBadge from './build-info-badge'

type Organization = {
  id: string
  name: string
  role: string
  plan?: string
}

interface AppShellProps {
  children: React.ReactNode
  organizations: Organization[]
  activeOrgId: string | null
  hasActiveAWS?: boolean
  commitSha?: string
  env?: string
  isAdmin?: boolean
  needsOnboarding?: boolean
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Costs', href: '/costs', icon: '💰' },
  { name: 'Usage', href: '/usage', icon: '📈' },
  { name: 'AI Logs', href: '/logs/ai', icon: '🤖' },
  { name: 'Cloud Accounts', href: '/accounts', icon: '☁️' },
  { name: 'Directory', href: '/directory', icon: '📁' },
  { name: 'Budgets', href: '/budgets', icon: '📋' },
  { name: 'Alerts', href: '/alerts', icon: '🔔' },
  { name: 'Notifications', href: '/notifications', icon: '🔔' },
  { name: 'Team', href: '/team', icon: '👥' },
  { name: 'Settings', href: '/settings/notifications', icon: '⚙️' },
]

export default function AppShell({ children, organizations, activeOrgId, hasActiveAWS = false, commitSha, env, isAdmin = false, needsOnboarding = false }: AppShellProps) {
  const uiDebugEnabled = process.env.NEXT_PUBLIC_UI_DEBUG === 'true'
  const showBuildInfo = isAdmin && uiDebugEnabled
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href)
  }

  const billingHref = activeOrgId ? `/organizations/${activeOrgId}/billing` : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile topbar */}
      <div className="lg:hidden bg-white shadow">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              PULSE
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            {showBuildInfo && <BuildInfoBadge commitSha={commitSha} env={env} />}
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-4 mb-4">
              <OrgSwitcher organizations={organizations} activeOrgId={activeOrgId} />
            </div>
            <nav className="space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
              {needsOnboarding && (
                <Link
                  href="/onboarding"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive('/onboarding')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-yellow-600 hover:bg-yellow-50'
                  }`}
                >
                  <span className="mr-3">🚀</span>
                  Onboarding
                </Link>
              )}
              {billingHref && (
                <Link
                  href={billingHref}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(billingHref)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">💳</span>
                  Billing
                </Link>
              )}
              <Link
                href="/connect"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive('/connect')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                data-testid="nav-connect"
              >
                <span className="mr-3">🔌</span>
                Connect
              </Link>
              {(isAdmin || true) && (
                <>
                  <Link
                    href="/developer"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/developer')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">💻</span>
                    Developer
                  </Link>
                </>
              )}
              {isAdmin && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Admin
                  </div>
                  <Link
                    href="/admin/ops"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/ops')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">⚙️</span>
                    Operations
                  </Link>
                  <Link
                    href="/admin/debug"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/debug')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">🐛</span>
                    Debug DB
                  </Link>
                  <Link
                    href="/admin/integrations"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/integrations')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">🔗</span>
                    Integrations
                  </Link>
                  <Link
                    href="/admin/integrations/ai"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/integrations/ai')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">🤖</span>
                    AI Providers
                  </Link>
                  <Link
                    href="/admin/integrations/webhooks"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/integrations/webhooks')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">🔗</span>
                    Webhooks
                  </Link>
                  <Link
                    href="/admin/e2e"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/e2e')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">✅</span>
                    E2E Validation
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar - FORCE VISIBLE on desktop >= 1024px */}
      <div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 lg:flex-col" data-testid="app-shell-sidebar" style={{ zIndex: 30 }}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              PULSE
            </Link>
          </div>
          {/* Build info badge - admin only */}
          {showBuildInfo && (
            <div className="px-4 pb-2 border-b border-gray-200">
              <BuildInfoBadge commitSha={commitSha} env={env} />
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 border-b border-gray-200">
              <OrgSwitcher organizations={organizations} activeOrgId={activeOrgId} />
            </div>
            <nav className="mt-4 space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
              {needsOnboarding && (
                <Link
                  href="/onboarding"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive('/onboarding')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-yellow-600 hover:bg-yellow-50'
                  }`}
                >
                  <span className="mr-3">🚀</span>
                  Onboarding
                </Link>
              )}
              {billingHref && (
                <Link
                  href={billingHref}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(billingHref)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">💳</span>
                  Billing
                </Link>
              )}
              {isAdmin && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Admin
                  </div>
                  <Link
                    href="/admin/ops"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/ops')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">⚙️</span>
                    Operations
                  </Link>
                  <Link
                    href="/admin/debug"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/debug')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">🐛</span>
                    Debug DB
                  </Link>
                  <Link
                    href="/admin/integrations"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/integrations')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">🔗</span>
                    Integrations
                  </Link>
                  <Link
                    href="/admin/integrations/ai"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/integrations/ai')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">🤖</span>
                    AI Providers
                  </Link>
                  <Link
                    href="/admin/integrations/webhooks"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/integrations/webhooks')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">🔗</span>
                    Webhooks
                  </Link>
                  <Link
                    href="/admin/e2e"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive('/admin/e2e')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3">✅</span>
                    E2E Validation
                  </Link>
                </>
              )}
            </nav>
          </div>
                 <div className="p-4 border-t border-gray-200">
                   <LogoutButton />
                 </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Desktop topbar */}
        <div className="hidden lg:block bg-white shadow">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              {/* Sync Now removed - use /accounts page instead */}
            </div>
            <div className="flex items-center space-x-4">
              {showBuildInfo && <BuildInfoBadge commitSha={commitSha} env={env} />}
              <Link href="/notifications" className="text-gray-700 hover:text-gray-900 relative">
                🔔
              </Link>
            </div>
          </div>
        </div>
        <main data-testid="app-shell-main">{children}</main>
      </div>
    </div>
  )
}

