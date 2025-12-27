'use client'

import { useEffect } from 'react'

/**
 * HydrationErrorDetector - Detects React hydration errors in development
 * 
 * This component intercepts console.error to catch hydration mismatches
 * and logs them with additional context for debugging.
 * 
 * Only active in development mode to avoid performance impact in production.
 */
export default function HydrationErrorDetector() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    // Store original console.error
    const originalConsoleError = console.error

    // Intercept console.error to detect hydration errors
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || ''
      
      // Check for hydration-related errors
      const isHydrationError = 
        message.includes('Hydration') ||
        message.includes('hydration') ||
        message.includes('Minified React error #418') ||
        message.includes('Text content does not match') ||
        message.includes('Did not expect server HTML') ||
        (message.includes('Warning:') && message.includes('server') && message.includes('client'))

      if (isHydrationError) {
        // Log with additional context
        const errorId = `hydration-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        
        console.group(`🚨 [HYDRATION ERROR DETECTED] ${errorId}`)
        console.error('Original error:', ...args)
        console.error('Error ID:', errorId)
        console.error('Timestamp:', new Date().toISOString())
        console.error('URL:', window.location.href)
        console.error('User Agent:', navigator.userAgent)
        console.groupEnd()

        // You could also send this to an error tracking service in development
        // Example: if (window.Sentry) { window.Sentry.captureMessage('Hydration error', { level: 'error', tags: { errorId } }) }
      }

      // Always call original console.error
      originalConsoleError.apply(console, args)
    }

    // Cleanup on unmount
    return () => {
      console.error = originalConsoleError
    }
  }, [])

  // This component doesn't render anything
  return null
}



