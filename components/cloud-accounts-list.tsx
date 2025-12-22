'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CloudAccount {
  id: string
  provider: string
  accountName: string
  accountIdentifier: string | null
  status: string
  notes: string | null
  createdAt: Date
}

interface CloudAccountsListProps {
  accounts: CloudAccount[]
}

export default function CloudAccountsList({ accounts }: CloudAccountsListProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleStatusChange = async (accountId: string, newStatus: string) => {
    setLoadingId(accountId)
    try {
      const res = await fetch(`/api/cloud-accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert('Failed to update account status')
      }
    } catch {
      alert('An error occurred')
    } finally {
      setLoadingId(null)
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No cloud accounts yet. Add your first account above.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Provider
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Account Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Identifier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">{account.provider}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">{account.accountName}</div>
                  {account.notes && (
                    <div className="text-xs text-gray-500 mt-1">{account.notes}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-500">{account.accountIdentifier || '-'}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    account.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : account.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {account.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-500">
                  {new Date(account.createdAt).toLocaleDateString()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <select
                  value={account.status}
                  onChange={(e) => handleStatusChange(account.id, e.target.value)}
                  disabled={loadingId === account.id}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

