'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  useEffect(() => {
    // In a real implementation, you might fetch the API key from an endpoint
    // For now, we'll show a placeholder
    setApiKey('<YOUR_API_KEY>')
  }, [])

  const copyToClipboard = (text: string, type: 'url' | 'key') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedKey(true)
        setTimeout(() => setCopiedKey(false), 2000)
      }
    })
  }

  const baseUrlCode = baseUrl
  const apiKeyCode = apiKey

  return (
    <div className="space-y-8">
      {/* Base URL Section */}
      <section>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4" data-testid="base-url-section">
            Base URL
          </h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-gray-100 px-4 py-2 rounded-md text-sm font-mono break-all">
              {baseUrlCode}
            </code>
            <button
              onClick={() => copyToClipboard(baseUrlCode, 'url')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
              data-testid="copy-base-url-btn"
            >
              {copiedUrl ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Use this as your <code className="bg-gray-100 px-1 py-0.5 rounded">baseURL</code> in OpenAI SDK, LangChain, or any OpenAI-compatible client
          </p>
        </div>
      </section>

      {/* API Key Section */}
      <section>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900" data-testid="api-key-section">
              API Key
            </h2>
            {hasApiKeys ? (
              <Link
                href="/admin/ai"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                data-testid="manage-api-keys-link"
              >
                Manage API Keys →
              </Link>
            ) : (
              <Link
                href="/admin/ai"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                data-testid="create-api-key-btn"
              >
                Create API Key
              </Link>
            )}
          </div>
          {hasApiKeys ? (
            <>
              <div className="flex items-center gap-3">
                <code className="flex-1 bg-gray-100 px-4 py-2 rounded-md text-sm font-mono break-all">
                  {apiKeyCode}
                </code>
                <button
                  onClick={() => copyToClipboard(apiKeyCode, 'key')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
                  data-testid="copy-api-key-btn"
                >
                  {copiedKey ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Replace <code className="bg-gray-100 px-1 py-0.5 rounded">{apiKeyCode}</code> with your actual API key from{' '}
                <Link href="/admin/ai" className="text-blue-600 hover:underline">API Keys</Link>
              </p>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                No API keys found. <Link href="/admin/ai" className="underline font-medium">Create an API key</Link> to use the OpenAI-compatible endpoints.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Code Snippets Section */}
      <section>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4" data-testid="code-snippets-section">
            Code Snippets
          </h2>

          <div className="space-y-6">
            {/* cURL */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">cURL</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`curl ${baseUrlCode}/chat/completions \\
  -H "Authorization: Bearer ${apiKeyCode}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}</code>
              </pre>
            </div>

            {/* Node.js (fetch) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Node.js (fetch)</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`const response = await fetch('${baseUrlCode}/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer ${apiKeyCode}\`,
    'Content-Type': 'application/json',
    'x-pulse-app': 'your-app-id', // Optional attribution
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
});

const data = await response.json();
console.log(data);`}</code>
              </pre>
            </div>

            {/* Python (requests) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Python (requests)</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import requests

response = requests.post(
    '${baseUrlCode}/chat/completions',
    headers={
        'Authorization': f'Bearer ${apiKeyCode}',
        'Content-Type': 'application/json',
        'x-pulse-app': 'your-app-id',  # Optional attribution
    },
    json={
        'model': 'gpt-4',
        'messages': [{'role': 'user', 'content': 'Hello!'}],
    },
)

data = response.json()
print(data)`}</code>
              </pre>
            </div>

            {/* OpenAI SDK (Node.js) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">OpenAI SDK (Node.js)</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '${apiKeyCode}',
  baseURL: '${baseUrlCode}', // Override base URL
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(completion.choices[0].message);`}</code>
              </pre>
            </div>

            {/* Vercel AI SDK */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Vercel AI SDK</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4', {
    baseURL: '${baseUrlCode}',
    apiKey: '${apiKeyCode}',
  }),
  prompt: 'Hello!',
});

console.log(result.text);`}</code>
              </pre>
            </div>

            {/* LangChain */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">LangChain</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{`import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  openAIApiKey: '${apiKeyCode}',
  configuration: {
    baseURL: '${baseUrlCode}',
  },
});

const response = await model.invoke('Hello!');
console.log(response);`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Attribution Headers Section */}
      <section>
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4" data-testid="attribution-headers-section">
            Attribution Headers (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Use these headers to track costs and usage by app, project, or client. If not provided, defaults from your API key will be used.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">x-pulse-app</code>
              <span className="text-sm text-gray-600">App ID for attribution</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">x-pulse-project</code>
              <span className="text-sm text-gray-600">Project ID for attribution</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">x-pulse-client</code>
              <span className="text-sm text-gray-600">Client ID for attribution</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">x-pulse-team</code>
              <span className="text-sm text-gray-600">Team ID for attribution</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/ai"
              className="block p-4 bg-white rounded-md border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
            >
              <h3 className="font-medium text-gray-900">Manage API Keys</h3>
              <p className="text-sm text-gray-600 mt-1">Create and manage your API keys</p>
            </Link>
            <Link
              href="/admin/integrations/ai"
              className="block p-4 bg-white rounded-md border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
            >
              <h3 className="font-medium text-gray-900">AI Integrations</h3>
              <p className="text-sm text-gray-600 mt-1">Configure AI providers and model routes</p>
            </Link>
            <Link
              href="/developer"
              className="block p-4 bg-white rounded-md border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
            >
              <h3 className="font-medium text-gray-900">Developer Portal</h3>
              <p className="text-sm text-gray-600 mt-1">View API keys and integration details</p>
            </Link>
            <Link
              href="/governance/ai-logs"
              className="block p-4 bg-white rounded-md border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
            >
              <h3 className="font-medium text-gray-900">AI Logs</h3>
              <p className="text-sm text-gray-600 mt-1">View request logs and costs</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

