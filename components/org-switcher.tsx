'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Organization = {
  id: string
  name: string
  role: string
}

export default function OrgSwitcher({
  organizations,
  activeOrgId,
}: {
  organizations: Organization[]
  activeOrgId: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Si une seule organisation, ne rien afficher
  if (organizations.length <= 1) {
    return null
  }

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOrgId = e.target.value
    if (newOrgId === activeOrgId) return

    setLoading(true)
    try {
      const res = await fetch('/api/active-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: newOrgId }),
      })

      if (res.ok) {
        router.refresh()
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={activeOrgId || ''}
      onChange={handleChange}
      disabled={loading}
      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name} ({org.role})
        </option>
      ))}
    </select>
  )
}

