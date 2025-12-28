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
      <div className="fixed bottom-2 left-2 lg:left-72 z-40 bg-yellow-900 text-yellow-100 text-[10px] font-mono px-2 py-1.5 rounded shadow-xl border border-yellow-700 max-w-[240px]">
        <div className="mb-1 text-yellow-300 font-semibold border-b border-yellow-700 pb-0.5 text-[10px]">
          ⚠️ Debug Disabled
        </div>
        <div className="space-y-0.5 text-[10px]">
          <div>
            <span className="text-yellow-400">ENV:</span>{' '}
            <span className="text-yellow-200 font-semibold">
              {uiDebugEnv || '(not set)'}
            </span>
          </div>
          <div>
            <span className="text-yellow-400">Admin:</span>{' '}
            <span className="text-green-400 font-semibold">{String(isAdmin)}</span>
          </div>
          <div className="mt-1 pt-1 border-t border-yellow-700 text-yellow-300 text-[9px]">
            Set NEXT_PUBLIC_UI_DEBUG="true"
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
      <div className="fixed bottom-2 left-2 lg:left-72 z-40 bg-gray-800 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg border border-gray-600">
        <div className="text-yellow-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-2 left-2 lg:left-72 z-40 bg-gray-900 text-white text-[10px] font-mono px-2 py-1.5 rounded shadow-xl border border-gray-700 max-w-[240px]">
      <div className="mb-1 text-yellow-400 font-semibold border-b border-gray-700 pb-0.5 text-[10px]">
        🔧 Debug
      </div>
      <div className="space-y-0.5 text-[10px]">
        {commitSha && (
          <div>
            <span className="text-gray-400">SHA:</span>{' '}
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
          <span className="text-gray-400">W:</span>{' '}
          <span className="text-green-400 font-semibold">{debugInfo.windowWidth}px</span>
        </div>
        <div>
          <span className="text-gray-400">Lg:</span>{' '}
          <span className={debugInfo.isLg ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {String(debugInfo.isLg)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Sidebar:</span>{' '}
          <span className={debugInfo.sidebarInDom ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {debugInfo.sidebarInDom ? '✓' : '✗'}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Shell:</span>{' '}
          <span className={debugInfo.appShellMounted ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {debugInfo.appShellMounted ? '✓' : '✗'}
          </span>
        </div>
      </div>
      {debugInfo.isLg && !debugInfo.sidebarInDom && (
        <div className="mt-1 pt-1 border-t border-gray-700 text-red-400 text-[9px]">
          ⚠️ Sidebar missing
        </div>
      )}
    </div>
  )
}

