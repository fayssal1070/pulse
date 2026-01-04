'use client'

/**
 * Developer Portal Client Component
 * Manages API keys and displays code snippets
 */

import { useState } from 'react'

interface ApiKey {
  id: string
  keyPrefix: string
  status: string
  enabled: boolean
  defaultAppId: string | null
  defaultProjectId: string | null
  defaultClientId: string | null
  rateLimitRpm: number | null
  createdAt: Date
  defaultApp?: { id: string; name: string; slug: string } | null
  defaultProject?: { id: string; name: string } | null
  defaultClient?: { id: string; name: string } | null
}

interface DeveloperPortalClientProps {
  organizationId: string
  initialKeys: ApiKey[]
  apps: Array<{ id: string; name: string; slug: string }>
  projects: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  baseUrl: string
}

export default function DeveloperPortalClient({
  organizationId,
  initialKeys,
  apps,
  projects,
  clients,
  baseUrl,
}: DeveloperPortalClientProps) {
  const [keys, setKeys] = useState(initialKeys)
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-8">
      {/* API Keys Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">API Keys</h2>
        <p className="text-gray-600 mb-4">
          Generate API keys to authenticate requests to the Pulse AI Gateway. Keys are shown only once on creation.
        </p>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prefix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Defaults</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{key.keyPrefix}...</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      key.status === 'active' && key.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {key.status === 'active' && key.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {key.rateLimitRpm ? `${key.rateLimitRpm}/min` : 'Unlimited'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {key.defaultApp?.name || key.defaultProject?.name || key.defaultClient?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Drop-in OpenAI SDK</h2>
        <p className="text-gray-600 mb-4">
          Use Pulse as a drop-in replacement for OpenAI. Point your OpenAI SDK to Pulse's API endpoint.
        </p>
        
        <div className="space-y-6">
          {/* Node.js */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Node.js (OpenAI SDK)</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{`import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: '${baseUrl}/api/v1'
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
});`}</code>
            </pre>
          </div>

          {/* Python */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Python (OpenAI SDK)</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{`from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="${baseUrl}/api/v1"
)

completion = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}]
)`}</code>
            </pre>
          </div>

          {/* cURL */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">cURL</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{`curl ${baseUrl}/api/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "x-pulse-app: my-app" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}</code>
            </pre>
          </div>
        </div>

        {/* Attribution Headers */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Optional Attribution Headers</h3>
          <p className="text-gray-600 mb-4">
            Include these headers to attribute requests to specific apps, projects, or clients:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li><code className="bg-gray-100 px-2 py-1 rounded">x-pulse-app</code>: App slug or ID</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">x-pulse-project</code>: Project ID</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">x-pulse-client</code>: Client ID</li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            If not provided, the API key's default values will be used (if configured).
          </p>
        </div>
      </div>
    </div>
  )
}

