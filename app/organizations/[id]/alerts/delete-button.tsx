'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteAlertButtonProps {
  alertId: string
  organizationId: string
}

export default function DeleteAlertButton({
  alertId,
  organizationId,
}: DeleteAlertButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/alerts/${alertId}`,
        {
          method: 'DELETE',
        }
      )

      if (!res.ok) {
        alert('Failed to delete alert')
        return
      }

      router.refresh()
    } catch {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 disabled:opacity-50"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}
