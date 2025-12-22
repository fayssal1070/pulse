'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteAlertButton({ alertId }: { alertId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this alert?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      })

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
      className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}

