'use client'

import { useState, useEffect } from 'react'

interface LastSyncedDateProps {
  date: Date | string
}

export default function LastSyncedDate({ date }: LastSyncedDateProps) {
  const [formatted, setFormatted] = useState<string>('')

  useEffect(() => {
    // Format only on client side after hydration to avoid mismatch
    const dateObj = typeof date === 'string' ? new Date(date) : date
    setFormatted(
      dateObj.toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    )
  }, [date])

  // Return empty string during SSR to avoid hydration mismatch
  if (!formatted) {
    return <span className="text-xs text-gray-500">...</span>
  }

  return <span className="text-xs text-gray-500">Dernière sync: {formatted}</span>
}




