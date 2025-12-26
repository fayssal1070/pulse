'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MarkNotificationReadButtonProps {
  notificationId: string
}

export default function MarkNotificationReadButton({
  notificationId,
}: MarkNotificationReadButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleMarkRead = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })

      if (!res.ok) {
        throw new Error('Failed to mark notification as read')
      }

      router.refresh()
    } catch (error) {
      console.error('Mark read error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleMarkRead}
      disabled={loading}
      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
    >
      {loading ? '...' : 'Mark read'}
    </button>
  )
}

