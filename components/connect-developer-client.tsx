'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Key {
  id: string
  keyPrefix: string
  defaultAppId: string | null
  defaultProjectId: string | null
  defaultClientId: string | null
  rateLimitRpm: number | null
  createdAt: Date
}

interface ConnectDeveloperClientProps {
  organizationId: string
  baseUrl: string
  initialKeys: Key[]
}

export default function ConnectDeveloperClient({
  organizationId,
  baseUrl,
  initialKeys,
}: ConnectDeveloperClientProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedApiKey, setCopiedApiKey] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<Key | null>(initialKeys[0] || null)
  const apiUrl = `${baseUrl}/api/v1`

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(apiUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleCopyApiKey = (keyPrefix: string) => {
    navigator.clipboard.writeText(`pulse_${keyPrefix}...`)
    setCopiedApiKey(keyPrefix)
    setTimeout(() => setCopiedApiKey(null), 2000)
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="space-y-8">
      {/* API Key Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">API Key</h2>
        {initialKeys.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              No API keys found. Create one in the{' '}
              <Link href="/developer" className="font-medium underline">
                Developer Portal
              </Link>{' '}
              or{' '}
              <Link href="/admin/ai" className="font-medium underline">
                Admin AI Settings
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select API Key
              </label>
              <select
                value={selectedKey?.id || ''}
                onChange={(e) => {
                  const key = initialKeys.find((k) => k.id === e.target.value)
                  setSelectedKey(key || null)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                data-testid="select-api-key"
              >
                {initialKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.keyPrefix}... (Created {new Date(key.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            {selectedKey && (
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">API Key Prefix</p>
                    <p className="text-lg font-mono font-semibold text-gray-900" data-testid="api-key-prefix">
                      pulse_{selectedKey.keyPrefix}...
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyApiKey(selectedKey.keyPrefix)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="copy-api-key"
                  >
                    {copiedApiKey === selectedKey.keyPrefix ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Base URL Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Base URL</h2>
        <div className="bg-gray-50 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Base URL</p>
              <p className="text-lg font-mono font-semibold text-gray-900" data-testid="base-url">
                {apiUrl}
              </p>
            </div>
            <button
              onClick={handleCopyUrl}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="copy-base-url"
            >
              {copiedUrl ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Code Examples Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Code Examples</h2>

        {/* cURL */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-800">cURL</h3>
            <button
              onClick={() => handleCopyCode(`curl ${apiUrl}/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "x-pulse-app: YOUR_APP_ID" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy
            </button>
          </div>
          <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto text-sm" data-testid="curl-example">
            <code>{`curl ${apiUrl}/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "x-pulse-app: YOUR_APP_ID" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</code>
          </pre>
        </div>

        {/* Node.js fetch */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-800">Node.js (fetch)</h3>
            <button
              onClick={() => handleCopyCode(`const response = await fetch('${apiUrl}/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
    'x-pulse-app': 'YOUR_APP_ID',
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
})

const data = await response.json()`)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy
            </button>
          </div>
          <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto text-sm" data-testid="node-example">
            <code>{`const response = await fetch('${apiUrl}/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
    'x-pulse-app': 'YOUR_APP_ID',
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
})

const data = await response.json()`}</code>
          </pre>
        </div>

        {/* Python requests */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-800">Python (requests)</h3>
            <button
              onClick={() => handleCopyCode(`import requests

response = requests.post(
    '${apiUrl}/chat/completions',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
        'x-pulse-app': 'YOUR_APP_ID',
    },
    json={
        'model': 'gpt-4',
        'messages': [{'role': 'user', 'content': 'Hello!'}],
    },
)

data = response.json()`)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy
            </button>
          </div>
          <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto text-sm" data-testid="python-example">
            <code>{`import requests

response = requests.post(
    '${apiUrl}/chat/completions',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
        'x-pulse-app': 'YOUR_APP_ID',
    },
    json={
        'model': 'gpt-4',
        'messages': [{'role': 'user', 'content': 'Hello!'}],
    },
)

data = response.json()`}</code>
          </pre>
        </div>

        {/* Vercel AI SDK */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-800">Vercel AI SDK</h3>
            <button
              onClick={() => handleCopyCode(`import { OpenAI } from '@ai-sdk/openai'

const openai = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: '${apiUrl}',
})

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
})`)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy
            </button>
          </div>
          <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto text-sm" data-testid="vercel-ai-sdk-example">
            <code>{`import { OpenAI } from '@ai-sdk/openai'

const openai = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: '${apiUrl}',
})

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
})`}</code>
          </pre>
        </div>

        {/* LangChain */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-800">LangChain</h3>
            <button
              onClick={() => handleCopyCode(`from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    openai_api_key='YOUR_API_KEY',
    base_url='${apiUrl}',
    model_name='gpt-4',
)

response = llm.invoke('Hello!')`)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy
            </button>
          </div>
          <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto text-sm" data-testid="langchain-example">
            <code>{`from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    openai_api_key='YOUR_API_KEY',
    base_url='${apiUrl}',
    model_name='gpt-4',
)

response = llm.invoke('Hello!')`}</code>
          </pre>
        </div>
      </div>

      {/* Attribution Headers Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Attribution Headers</h2>
        <p className="text-sm text-blue-800 mb-4">
          Optional headers to track costs by app, project, team, or client:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
          <li>
            <code className="bg-blue-100 px-2 py-1 rounded">x-pulse-org</code> - Organization ID (optional if API key implies org)
          </li>
          <li>
            <code className="bg-blue-100 px-2 py-1 rounded">x-pulse-team</code> - Team ID
          </li>
          <li>
            <code className="bg-blue-100 px-2 py-1 rounded">x-pulse-project</code> - Project ID
          </li>
          <li>
            <code className="bg-blue-100 px-2 py-1 rounded">x-pulse-app</code> - App ID (required if requireAttribution policy enabled)
          </li>
          <li>
            <code className="bg-blue-100 px-2 py-1 rounded">x-pulse-client</code> - Client ID
          </li>
        </ul>
        <p className="text-sm text-blue-700 mt-4">
          If headers are missing, defaults from your API key will be used (if configured in{' '}
          <Link href="/developer" className="font-medium underline">
            Developer Portal
          </Link>
          ).
        </p>
      </div>

      {/* Quick Links */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/developer"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Developer Portal</h3>
            <p className="text-sm text-gray-600 mt-1">Manage API keys and settings</p>
          </Link>
          <Link
            href="/admin/integrations/ai"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">AI Integrations</h3>
            <p className="text-sm text-gray-600 mt-1">Configure providers and routes</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

