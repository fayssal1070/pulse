'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'
import WaitlistForm from '@/components/waitlist-form'

function ContactPageContent() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    action: action || 'demo',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (action) {
      setFormData(prev => ({ ...prev, action }))
    }
  }, [action])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate form submission (in production, this would send to an API)
    setTimeout(() => {
      setSubmitted(true)
      setLoading(false)
    }, 1000)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-grow flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              {formData.action === 'demo'
                ? "We'll contact you within 24 hours to schedule your demo."
                : "You've been added to our waitlist. We'll notify you when we launch."}
            </p>
            <button
              onClick={() => {
                setSubmitted(false)
                setFormData({ name: '', email: '', company: '', message: '', action: action || 'demo' })
              }}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Send Another Message
            </button>
          </div>
        </main>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      
      <main className="flex-grow">
        <section className="bg-white py-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {formData.action === 'demo' ? 'Request a Demo' : 'Join the Waitlist'}
              </h1>
              <p className="text-xl text-gray-600">
                {formData.action === 'demo'
                  ? 'See how PULSE can help you manage your cloud costs. Schedule a personalized demo with our team.'
                  : 'Be the first to know when we launch. Join our waitlist and get early access.'}
              </p>
            </div>

            {formData.action === 'waitlist' ? (
              <div className="bg-gray-50 rounded-lg p-8">
                <WaitlistForm source="contact" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-8 space-y-6">
                <div>
                  <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-2">
                    I want to
                  </label>
                  <select
                    id="action"
                    value={formData.action}
                    onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="demo">Request a Demo</option>
                    <option value="waitlist">Join the Waitlist</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell us about your cloud cost management needs..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Request Demo'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-grow flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Loading...</div>
        </main>
        <PublicFooter />
      </div>
    }>
      <ContactPageContent />
    </Suspense>
  )
}
