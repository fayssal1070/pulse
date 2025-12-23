'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CloudAccountSyncButtonProps {
  cloudAccountId: string
}

export default function CloudAccountSyncButton({ cloudAccountId }: CloudAccountSyncButtonProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch(`/api/cloud-accounts/${cloudAccountId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || 'Rate limit exceeded. Please wait before syncing again.')
        } else {
          setError(data.error || 'Sync failed')
        }
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      setError('An error occurred while syncing')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col items-end space-y-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
      {error && (
        <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-600">✓ Sync successful!</p>
      )}
    </div>
  )
}

