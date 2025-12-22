'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface WaitlistFormProps {
  source?: string // 'landing' or 'contact'
}

export default function WaitlistForm({ source = 'landing' }: WaitlistFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    company: '',
    role: '',
    cloudProvider: '',
    monthlyCloudSpendRange: '',
    message: '',
    honeypot: '', // Hidden field for spam protection
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit. Please try again.')
        setLoading(false)
        return
      }

      // Redirect to thank you page
      router.push(`/thank-you?leadId=${data.leadId}&source=${source}`)
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
      )}

      {/* Honeypot field - hidden from users */}
      <input
        type="text"
        name="website"
        value={formData.honeypot}
        onChange={(e) => setFormData(prev => ({ ...prev, honeypot: e.target.value }))}
        style={{ position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

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
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
          Company *
        </label>
        <input
          type="text"
          id="company"
          required
          value={formData.company}
          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Your Company"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
          Role
        </label>
        <input
          type="text"
          id="role"
          value={formData.role}
          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., CTO, DevOps Engineer"
        />
      </div>

      <div>
        <label htmlFor="cloudProvider" className="block text-sm font-medium text-gray-700 mb-2">
          Primary Cloud Provider
        </label>
        <select
          id="cloudProvider"
          value={formData.cloudProvider}
          onChange={(e) => setFormData(prev => ({ ...prev, cloudProvider: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select...</option>
          <option value="AWS">AWS</option>
          <option value="GCP">Google Cloud Platform</option>
          <option value="Azure">Microsoft Azure</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="monthlyCloudSpendRange" className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Cloud Spend
        </label>
        <select
          id="monthlyCloudSpendRange"
          value={formData.monthlyCloudSpendRange}
          onChange={(e) => setFormData(prev => ({ ...prev, monthlyCloudSpendRange: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select...</option>
          <option value="0-1000">€0 - €1,000</option>
          <option value="1000-5000">€1,000 - €5,000</option>
          <option value="5000-10000">€5,000 - €10,000</option>
          <option value="10000-50000">€10,000 - €50,000</option>
          <option value="50000+">€50,000+</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Message
        </label>
        <textarea
          id="message"
          rows={3}
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
        {loading ? 'Submitting...' : 'Join Waitlist'}
      </button>
    </form>
  )
}

