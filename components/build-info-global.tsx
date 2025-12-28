'use client'

import { useEffect, useState } from 'react'

interface BuildInfoGlobalProps {
  commitSha: string
  env: string
}

export default function BuildInfoGlobal({ commitSha, env }: BuildInfoGlobalProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const uiDebugEnabled = process.env.NEXT_PUBLIC_UI_DEBUG === 'true'

  useEffect(() => {
    // Check if user is admin via API
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/check')
        const data = await res.json()
        setIsAdmin(data.isAdmin || false)
      } catch (error) {
        // Silent fail - not admin
        setIsAdmin(false)
      }
    }
    checkAdmin()
  }, [])

  if (!uiDebugEnabled || !isAdmin) {
    return null
  }

  const commitShaShort = commitSha.substring(0, 7)
  
  return (
    <div 
      className="fixed bottom-0 right-0 z-50 bg-black text-white text-xs font-mono px-3 py-1 rounded-tl-lg border-t border-l border-gray-600 shadow-lg"
      style={{ 
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.4',
        userSelect: 'all',
        cursor: 'text'
      }}
      title={`Commit: ${commitSha}\nEnv: ${env}\nClick to select`}
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{env}</span>
        <span className="text-gray-500">•</span>
        <span className="text-blue-400 font-bold">{commitShaShort}</span>
      </div>
    </div>
  )
}

