'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkAllReadButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleMarkAllRead = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark all as read')
      }

      router.refresh()
    } catch (error) {
      console.error('Error marking all as read:', error)
      alert('Failed to mark all notifications as read')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleMarkAllRead}
      disabled={loading}
      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
    >
      {loading ? 'Marking...' : 'Mark all as read'}
    </button>
  )
}

