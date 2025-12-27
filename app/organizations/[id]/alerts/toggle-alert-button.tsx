'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ToggleAlertButtonProps {
  alertId: string
  organizationId: string
  enabled: boolean
}

export default function ToggleAlertButton({
  alertId,
  organizationId,
  enabled,
}: ToggleAlertButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/alerts/${alertId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: !enabled }),
        }
      )

      if (!res.ok) {
        throw new Error('Failed to toggle alert')
      }

      router.refresh()
    } catch (error) {
      console.error('Toggle error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1 text-sm rounded-md ${
        enabled
          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          : 'bg-green-100 text-green-800 hover:bg-green-200'
      } disabled:opacity-50`}
    >
      {loading ? '...' : enabled ? 'Disable' : 'Enable'}
    </button>
  )
}



