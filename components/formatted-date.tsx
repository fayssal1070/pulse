'use client'

import { useState, useEffect } from 'react'

interface FormattedDateProps {
  date: Date | string
  locale?: string
  options?: Intl.DateTimeFormatOptions
}

export default function FormattedDate({ 
  date, 
  locale = 'en-US',
  options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
}: FormattedDateProps) {
  const [formatted, setFormatted] = useState<string>('')

  useEffect(() => {
    // Format only on client side after hydration to avoid mismatch
    const dateObj = typeof date === 'string' ? new Date(date) : date
    setFormatted(dateObj.toLocaleDateString(locale, options))
  }, [date, locale, options])

  // Return empty string during SSR to avoid hydration mismatch
  if (!formatted) {
    return <span>...</span>
  }

  return <span>{formatted}</span>
}




