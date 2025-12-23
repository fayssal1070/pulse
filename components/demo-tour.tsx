'use client'

import { useState, useEffect } from 'react'

interface TourStep {
  id: string
  title: string
  description: string
  target: string // CSS selector or element ID
  position: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-1',
    title: 'Monthly Spending Trend',
    description: 'Track your cloud costs over the last 12 months. See how your spending evolves and identify trends.',
    target: '#demo-monthly-trend',
    position: 'bottom',
  },
  {
    id: 'step-2',
    title: 'Anomaly Alerts',
    description: 'Get notified when unusual spending patterns are detected. Stay on top of unexpected cost spikes.',
    target: '#demo-alerts',
    position: 'right',
  },
  {
    id: 'step-3',
    title: 'Top Cost Drivers',
    description: 'Identify which services consume the most budget. Focus your optimization efforts where it matters most.',
    target: '#demo-cost-drivers',
    position: 'left',
  },
]

export default function DemoTour() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the tour
    const tourDismissed = localStorage.getItem('demo-tour-dismissed')
    if (!tourDismissed) {
      // Show tour automatically on first visit
      setTimeout(() => {
        setShowTour(true)
        setIsActive(true)
      }, 500) // Small delay to ensure page is rendered
    }
  }, [])

  useEffect(() => {
    if (!isActive) return

    const step = TOUR_STEPS[currentStep]
    if (!step) return

    const targetElement = document.querySelector(step.target)
    if (!targetElement) {
      // If element not found, skip to next step
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        setIsActive(false)
      }
      return
    }

    // Scroll to element
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Add highlight class
    targetElement.classList.add('demo-tour-highlight')

    return () => {
      targetElement.classList.remove('demo-tour-highlight')
    }
  }, [isActive, currentStep])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setIsActive(false)
    setShowTour(false)
    localStorage.setItem('demo-tour-dismissed', 'true')
  }

  const handleComplete = () => {
    setIsActive(false)
    setShowTour(false)
    localStorage.setItem('demo-tour-dismissed', 'true')
    
    // Scroll to CTA form
    setTimeout(() => {
      const ctaForm = document.querySelector('#demo-early-access')
      if (ctaForm) {
        ctaForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 300)
  }

  const handleStartTour = () => {
    setCurrentStep(0)
    setIsActive(true)
    setShowTour(true)
  }

  if (!showTour && !isActive) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleStartTour}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Start Guided Tour</span>
        </button>
      </div>
    )
  }

  if (!isActive) return null

  const step = TOUR_STEPS[currentStep]
  if (!step) return null

  const targetElement = document.querySelector(step.target)
  if (!targetElement) return null

  const rect = targetElement.getBoundingClientRect()
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10000,
  }

  // Calculate tooltip position based on step.position
  switch (step.position) {
    case 'top':
      tooltipStyle.bottom = window.innerHeight - rect.top + 20
      tooltipStyle.left = rect.left + rect.width / 2
      tooltipStyle.transform = 'translateX(-50%)'
      break
    case 'bottom':
      tooltipStyle.top = rect.bottom + 20
      tooltipStyle.left = rect.left + rect.width / 2
      tooltipStyle.transform = 'translateX(-50%)'
      break
    case 'left':
      tooltipStyle.top = rect.top + rect.height / 2
      tooltipStyle.right = window.innerWidth - rect.left + 20
      tooltipStyle.transform = 'translateY(-50%)'
      break
    case 'right':
      tooltipStyle.top = rect.top + rect.height / 2
      tooltipStyle.left = rect.right + 20
      tooltipStyle.transform = 'translateY(-50%)'
      break
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={handleSkip}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Spotlight effect */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          top: rect.top - 10,
          left: rect.left - 10,
          width: rect.width + 20,
          height: rect.height + 20,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.5)',
          borderRadius: '8px',
        }}
      />

      {/* Tooltip */}
      <div
        className="bg-white rounded-lg shadow-2xl p-6 max-w-sm z-[10000] pointer-events-auto"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-sm text-gray-600">{step.description}</p>
          </div>
          <button
            onClick={handleSkip}
            className="ml-4 text-gray-400 hover:text-gray-600"
            aria-label="Close tour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Skip Tour
            </button>
          </div>
          <button
            onClick={handleNext}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}

