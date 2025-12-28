'use client'

import { useEffect, useState } from 'react'

interface UIDebugPanelProps {
  commitSha?: string
  env?: string
  isAdmin: boolean
}

export default function UIDebugPanel({ commitSha, env, isAdmin }: UIDebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<{
    windowWidth: number
    isLg: boolean
    sidebarInDom: boolean
    appShellMounted: boolean
  } | null>(null)
  const [showDiagnostic, setShowDiagnostic] = useState(false)

  // Check env var - must be exactly 'true' (string)
  const uiDebugEnv = process.env.NEXT_PUBLIC_UI_DEBUG
  const uiDebugEnabled = uiDebugEnv === 'true'

  // Diagnostic: show why panel is hidden (only for admins)
  useEffect(() => {
    if (isAdmin && !uiDebugEnabled) {
      // Show diagnostic after a delay to avoid flicker
      const timer = setTimeout(() => setShowDiagnostic(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [isAdmin, uiDebugEnabled])

  useEffect(() => {
    if (!uiDebugEnabled || !isAdmin) {
      return
    }

    const updateDebug = () => {
      const width = window.innerWidth
      const isLg = width >= 1024 // Tailwind lg breakpoint
      const sidebar = document.querySelector('[data-testid="app-shell-sidebar"]')
      const sidebarInDom = sidebar !== null
      const appShellMain = document.querySelector('[data-testid="app-shell-main"]')
      const appShellMounted = appShellMain !== null

      setDebugInfo({
        windowWidth: width,
        isLg,
        sidebarInDom,
        appShellMounted,
      })
    }

    updateDebug()
    window.addEventListener('resize', updateDebug)
    return () => window.removeEventListener('resize', updateDebug)
  }, [uiDebugEnabled, isAdmin])

  // Diagnostic panel for admins when debug is disabled
  if (isAdmin && !uiDebugEnabled && showDiagnostic) {
    return (
      <div className="fixed bottom-4 left-4 lg:left-72 z-40 bg-yellow-900 text-yellow-100 text-xs font-mono px-4 py-3 rounded-lg shadow-xl border border-yellow-700 max-w-sm">
        <div className="mb-2 text-yellow-300 font-bold border-b border-yellow-700 pb-1">
          ⚠️ Debug Panel Disabled
        </div>
        <div className="space-y-1.5 text-xs">
          <div>
            <span className="text-yellow-400">NEXT_PUBLIC_UI_DEBUG:</span>{' '}
            <span className="text-yellow-200 font-semibold">
              {uiDebugEnv || '(not set)'}
            </span>
          </div>
          <div>
            <span className="text-yellow-400">isAdmin:</span>{' '}
            <span className="text-green-400 font-semibold">{String(isAdmin)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-yellow-700 text-yellow-300 text-xs">
            💡 Set <code className="bg-yellow-800 px-1 rounded">NEXT_PUBLIC_UI_DEBUG="true"</code> in Vercel to enable
          </div>
        </div>
      </div>
    )
  }

  if (!uiDebugEnabled || !isAdmin) {
    return null
  }

  if (!debugInfo) {
    return (
      <div className="fixed bottom-4 left-4 lg:left-72 z-40 bg-gray-800 text-white text-xs font-mono px-3 py-2 rounded-lg shadow-lg border border-gray-600">
        <div className="text-yellow-400">UI Debug: Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 lg:left-72 z-40 bg-gray-900 text-white text-xs font-mono px-4 py-3 rounded-lg shadow-xl border border-gray-700 max-w-sm">
      <div className="mb-2 text-yellow-400 font-bold border-b border-gray-700 pb-1">
        🔧 Debug Panel (Admin Only)
      </div>
      <div className="space-y-1.5">
        {commitSha && (
          <div>
            <span className="text-gray-400">Commit:</span>{' '}
            <span className="text-blue-400 font-semibold">{commitSha.substring(0, 7)}</span>
          </div>
        )}
        {env && (
          <div>
            <span className="text-gray-400">Env:</span>{' '}
            <span className="text-purple-400 font-semibold">{env}</span>
          </div>
        )}
        <div>
          <span className="text-gray-400">Window:</span>{' '}
          <span className="text-green-400 font-semibold">{debugInfo.windowWidth}px</span>
        </div>
        <div>
          <span className="text-gray-400">isLg:</span>{' '}
          <span className={debugInfo.isLg ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {String(debugInfo.isLg)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Sidebar in DOM:</span>{' '}
          <span className={debugInfo.sidebarInDom ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {String(debugInfo.sidebarInDom)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">AppShell:</span>{' '}
          <span className={debugInfo.appShellMounted ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {debugInfo.appShellMounted ? 'MOUNTED' : 'NOT MOUNTED'}
          </span>
        </div>
      </div>
      {debugInfo.isLg && !debugInfo.sidebarInDom && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-red-400 text-xs">
          ⚠️ Sidebar should be visible on desktop
        </div>
      )}
    </div>
  )
}

