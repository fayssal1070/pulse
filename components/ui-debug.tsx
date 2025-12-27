'use client'

import { useEffect, useState } from 'react'

export default function UIDebug() {
  const [debugInfo, setDebugInfo] = useState<{
    windowWidth: number
    isLg: boolean
    sidebarInDom: boolean
  } | null>(null)

  useEffect(() => {
    const updateDebug = () => {
      const width = window.innerWidth
      const isLg = width >= 1024 // Tailwind lg breakpoint
      const sidebar = document.querySelector('[data-testid="app-shell-sidebar"]')
      const sidebarInDom = sidebar !== null

      setDebugInfo({
        windowWidth: width,
        isLg,
        sidebarInDom,
      })
    }

    updateDebug()
    window.addEventListener('resize', updateDebug)
    return () => window.removeEventListener('resize', updateDebug)
  }, [])

  if (!debugInfo) {
    return (
      <div className="mt-1 text-xs text-gray-400 font-mono">
        UI debug: Loading...
      </div>
    )
  }

  return (
    <div className="mt-1 text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
      <div className="flex items-center gap-4">
        <span>
          windowWidth: <span className="font-bold">{debugInfo.windowWidth}px</span>
        </span>
        <span>
          isLg: <span className={debugInfo.isLg ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{String(debugInfo.isLg)}</span>
        </span>
        <span>
          sidebarInDom: <span className={debugInfo.sidebarInDom ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{String(debugInfo.sidebarInDom)}</span>
        </span>
      </div>
      {debugInfo.isLg && !debugInfo.sidebarInDom && (
        <div className="mt-1 text-red-600 font-semibold">
          ⚠️ AppShell not mounted or wrong route
        </div>
      )}
      {debugInfo.isLg && debugInfo.sidebarInDom && (
        <div className="mt-1 text-green-600 font-semibold">
          ✅ Sidebar in DOM - check CSS if not visible
        </div>
      )}
      {!debugInfo.isLg && (
        <div className="mt-1 text-yellow-600 font-semibold">
          ℹ️ Mobile view - sidebar hidden (expected)
        </div>
      )}
    </div>
  )
}



