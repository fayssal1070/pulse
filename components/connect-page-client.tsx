'use client'

/**
 * Connect Page Client Component
 * User-friendly interface for connecting to Pulse AI Gateway
 */

import { useState, useEffect } from 'react'

interface ConnectPageClientProps {
  organizationId: string
  organizationName: string
  baseUrl: string
  hasApiKeys: boolean
}

export default function ConnectPageClient({
  organizationId,
  organizationName,
  baseUrl,
  hasApiKeys,
}: ConnectPageClientProps) {
  const [apiKey, setApiKey] = useState<string>('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Fetch API keys on mount
  useEffect(() => {
    if (hasApiKeys) {
      loadApiKeys()
    }
  }, [hasApiKeys])

  const loadApiKeys = async () => {
    try {
      const res = await fetch('/api/admin/ai/keys')
      const data = await res.json()
      if (res.ok && data.keys && data.keys.length > 0) {
        // Store first key (user will need to copy from /admin/ai for actual key)
        setApiKey('YOUR_API_KEY_HERE')
      }
    } catch (error) {
      // Silent fail
    }
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      setTestResult({ success: false, message: 'Please enter a valid API key' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await res.json()

      if (res.ok) {
        setTestResult({
          success: true,
          message: `Connection successful! Found ${data.data?.length || 0} models.`,
        })
      } else {
        setTestResult({
          success: false,
          message: data.error?.message || `Connection failed: ${res.status} ${res.statusText}`,
        })
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection failed. Check your API key and network connection.',
      })
    } finally {
      setTesting(false)
    }
  }

  const baseUrlDisplay = baseUrl
  const curlSnippet = `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`

  return (
    <div className="space-y-8">
      {/* Base URL Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Base URL</h2>
        <p className="text-gray-600 mb-4">Use this base URL for all API requests:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 px-4 py-3 rounded-md font-mono text-sm">{baseUrlDisplay}</code>
          <button
            onClick={() => handleCopy(baseUrlDisplay, 'baseurl')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {copied === 'baseurl' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">API Key</h2>
        {!hasApiKeys ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800">
              <strong>No API keys found.</strong>{' '}
              <a href="/admin/ai" className="underline font-medium">
                Create an API key
              </a>{' '}
              to get started.
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              Enter your API key to test the connection. Get your keys from{' '}
              <a href="/admin/ai" className="text-blue-600 underline">
                API Keys management
              </a>
              .
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="pulse_key_..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult && (
                <div
                  className={`p-4 rounded-md ${
                    testResult.success
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {testResult.message}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Start Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>
        <p className="text-gray-600 mb-4">Test the API with a simple cURL command:</p>
        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{curlSnippet}</code>
          </pre>
          <button
            onClick={() => handleCopy(curlSnippet, 'curl')}
            className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
          >
            {copied === 'curl' ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* SDK Installation */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">SDK Installation</h2>
        <p className="text-gray-600 mb-4">
          Install the Pulse OpenAI SDK for a better developer experience:
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">npm</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-4 py-3 rounded-md font-mono text-sm">
                npm install @pulse/openai openai
              </code>
              <button
                onClick={() => handleCopy('npm install @pulse/openai openai', 'npm')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {copied === 'npm' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800">
          <li>
            <a href="/admin/ai" className="underline">
              Manage API Keys
            </a>
          </li>
          <li>
            <a href="/developer" className="underline">
              Developer Portal
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
