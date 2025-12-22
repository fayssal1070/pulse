'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CloudAccountFormProps {
  organizationId: string
}

export default function CloudAccountForm({ organizationId }: CloudAccountFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    provider: '',
    accountName: '',
    accountIdentifier: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/cloud-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create cloud account')
        return
      }

      // Reset form
      setFormData({
        provider: '',
        accountName: '',
        accountIdentifier: '',
        notes: '',
      })
      router.refresh()
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
            Cloud Provider *
          </label>
          <select
            id="provider"
            required
            value={formData.provider}
            onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select provider...</option>
            <option value="AWS">AWS</option>
            <option value="GCP">Google Cloud Platform</option>
            <option value="Azure">Microsoft Azure</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">
            Account Name *
          </label>
          <input
            type="text"
            id="accountName"
            required
            value={formData.accountName}
            onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
            placeholder="e.g., Production Account"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="accountIdentifier" className="block text-sm font-medium text-gray-700 mb-2">
          Account Identifier
        </label>
        <input
          type="text"
          id="accountIdentifier"
          value={formData.accountIdentifier}
          onChange={(e) => setFormData(prev => ({ ...prev, accountIdentifier: e.target.value }))}
          placeholder="e.g., AWS Account ID, GCP Project ID"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional: AWS Account ID, GCP Project ID, Azure Subscription ID, etc.
        </p>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Optional notes about this account..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Adding...' : 'Add Cloud Account'}
      </button>
    </form>
  )
}

