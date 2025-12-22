'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  email: string
  company: string
  role: string | null
  cloudProvider: string | null
  monthlyCloudSpendRange: string | null
  message: string | null
  archived: boolean
  createdAt: Date
}

interface LeadsTableProps {
  leads: Lead[]
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleArchive = async (leadId: string, archived: boolean) => {
    setLoadingId(leadId)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert('Failed to update lead')
      }
    } catch {
      alert('An error occurred')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return
    }

    setLoadingId(leadId)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert('Failed to delete lead')
      }
    } catch {
      alert('An error occurred')
    } finally {
      setLoadingId(null)
    }
  }

  if (leads.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-gray-500">
        No leads found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cloud Provider
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Monthly Spend
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => (
            <tr key={lead.id} className={lead.archived ? 'bg-gray-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{lead.email}</div>
                {lead.message && (
                  <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={lead.message}>
                    {lead.message}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{lead.company}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{lead.role || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{lead.cloudProvider || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{lead.monthlyCloudSpendRange || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleArchive(lead.id, !lead.archived)}
                    disabled={loadingId === lead.id}
                    className={`px-3 py-1 text-xs rounded-md ${
                      lead.archived
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    } disabled:opacity-50`}
                  >
                    {loadingId === lead.id ? '...' : lead.archived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={() => handleDelete(lead.id)}
                    disabled={loadingId === lead.id}
                    className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

