'use client'

import { useState } from 'react'

interface DemoActionDisabledProps {
  children: React.ReactNode
  actionName?: string
}

export default function DemoActionDisabled({ children, actionName = 'This action' }: DemoActionDisabledProps) {
  const [showToast, setShowToast] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <>
      <div onClick={handleClick} className="cursor-not-allowed opacity-50">
        {children}
      </div>
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-lg z-50 max-w-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-700">
              <span className="font-semibold">Demo Mode:</span> {actionName} is disabled in demo mode.
            </p>
          </div>
        </div>
      )}
    </>
  )
}






