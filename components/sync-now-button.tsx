'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SyncNowButtonProps {
  accountId?: string
  orgId?: string
}

export default function SyncNowButton({ accountId, orgId }: SyncNowButtonProps = { accountId: undefined, orgId: undefined }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setError(null)

    try {
      let targetAccountId = accountId

      // If no accountId provided, find AWS account for active org
      if (!targetAccountId) {
        const activeOrgRes = await fetch('/api/active-org')
        const activeOrgData = await activeOrgRes.json()
        const activeOrgId = orgId || activeOrgData.orgId

        if (!activeOrgId) {
          setError('No active organization')
          return
        }

        const accountsRes = await fetch(`/api/cloud-accounts?orgId=${activeOrgId}`)
        const accountsData = await accountsRes.json()
        
        const awsAccount = accountsData.accounts?.find(
          (acc: any) => acc.provider === 'AWS' && 
                       acc.connectionType === 'COST_EXPLORER' && 
                       acc.status === 'active'
        )

        if (!awsAccount) {
          setError('No active AWS account found')
          return
        }

        targetAccountId = awsAccount.id
      }

      // Trigger sync
      const syncRes = await fetch(`/api/cloud-accounts/${targetAccountId}/sync`, {
        method: 'POST',
      })

      if (!syncRes.ok) {
        const errorData = await syncRes.json()
        throw new Error(errorData.error || 'Sync failed')
      }

      // Refresh the page to show updated data
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to sync')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Syncing...' : 'Sync Now'}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded shadow-lg z-10 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  )
}

