'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

/**
 * ErrorBoundary - Catches React errors and displays a fallback UI
 * Prevents the entire app from crashing with a gray screen
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate a unique error ID for tracking
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    return {
      hasError: true,
      error: error,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with trace ID
    const errorId = this.state.errorId || `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    console.error('[ErrorBoundary]', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error, { tags: { errorId } })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-sm text-gray-600 text-center mb-4">
              Le dashboard a rencontré une erreur inattendue. Veuillez recharger la page.
            </p>
            {this.state.errorId && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">ID de trace :</p>
                <code className="text-xs font-mono text-gray-700 break-all">
                  {this.state.errorId}
                </code>
              </div>
            )}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-50 rounded-md border border-red-200">
                <p className="text-xs font-medium text-red-800 mb-1">Erreur (dev only) :</p>
                <p className="text-xs text-red-700 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">Stack trace</summary>
                    <pre className="text-xs text-red-700 mt-2 overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}




