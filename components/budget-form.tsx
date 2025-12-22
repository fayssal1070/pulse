'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Organization = {
  id: string
  name: string
  budgetMonthlyEUR: number | null
}

export default function BudgetForm({ organization }: { organization: Organization }) {
  const router = useRouter()
  const [budget, setBudget] = useState(organization.budgetMonthlyEUR?.toString() || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setBudget(organization.budgetMonthlyEUR?.toString() || '')
    setSuccess(false)
  }, [organization.id, organization.budgetMonthlyEUR])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const res = await fetch(`/api/organizations/${organization.id}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetMonthlyEUR: budget ? parseFloat(budget) : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update budget')
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Budget (EUR)
        </label>
        <input
          type="number"
          id="budget"
          step="0.01"
          min="0"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="0.00"
        />
        <p className="mt-1 text-sm text-gray-500">
          Leave empty to remove budget tracking for this organization.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
          Budget updated successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Save Budget'}
      </button>
    </form>
  )
}

