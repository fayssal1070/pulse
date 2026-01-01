import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { isAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import AppShell from '@/components/app-shell'
import Link from 'next/link'

export default async function AiLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/governance' })
  const isAdminUser = await isAdmin()
  const role = await getUserRole(activeOrg.id)
  const { id } = await params

  // Get log
  const log = await prisma.aiRequestLog.findUnique({
    where: { id },
    select: {
      id: true,
      orgId: true,
      occurredAt: true,
      userId: true,
      teamId: true,
      projectId: true,
      appId: true,
      clientId: true,
      provider: true,
      model: true,
      promptHash: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      estimatedCostEur: true,
      latencyMs: true,
      statusCode: true,
      rawRef: true,
    },
  })

  if (!log) {
    notFound()
  }

  // RBAC: check org access
  if (log.orgId !== activeOrg.id) {
    notFound()
  }

  // RBAC: users can only see their own logs
  if (role === 'user' && log.userId !== user.id) {
    notFound()
  }

  const rawRef = (log.rawRef as any) || {}
  const reason = rawRef.reason || null

  // Don't display secrets (like API keys)
  const sanitizedRawRef = { ...rawRef }
  if (sanitizedRawRef.apiKey) {
    sanitizedRawRef.apiKey = '***REDACTED***'
  }
  if (sanitizedRawRef.headers) {
    const headers = sanitizedRawRef.headers as any
    if (headers['Authorization']) {
      headers['Authorization'] = '***REDACTED***'
    }
  }

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link href="/governance" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
              ← Back to Governance
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">AI Request Log Detail</h2>
            <p className="text-sm text-gray-500 mt-1">Request ID: {log.id}</p>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Request Information</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Time</p>
                  <p className="text-sm text-gray-900">{new Date(log.occurredAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Provider</p>
                  <p className="text-sm text-gray-900">{log.provider || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Model</p>
                  <p className="text-sm text-gray-900">{log.model || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status Code</p>
                  <p className="text-sm text-gray-900">{log.statusCode || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cost (EUR)</p>
                  <p className="text-sm text-gray-900">
                    {log.estimatedCostEur ? Number(log.estimatedCostEur).toFixed(4) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Latency</p>
                  <p className="text-sm text-gray-900">{log.latencyMs ? `${log.latencyMs}ms` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Input Tokens</p>
                  <p className="text-sm text-gray-900">{log.inputTokens || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Output Tokens</p>
                  <p className="text-sm text-gray-900">{log.outputTokens || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Tokens</p>
                  <p className="text-sm text-gray-900">{log.totalTokens || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Prompt Hash</p>
                  <p className="text-sm text-gray-900 font-mono text-xs">{log.promptHash || '-'}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-500 mb-2">Dimensions</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">User ID</p>
                    <p className="text-sm text-gray-900">{log.userId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Team ID</p>
                    <p className="text-sm text-gray-900">{log.teamId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Project ID</p>
                    <p className="text-sm text-gray-900">{log.projectId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">App ID</p>
                    <p className="text-sm text-gray-900">{log.appId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Client ID</p>
                    <p className="text-sm text-gray-900">{log.clientId || '-'}</p>
                  </div>
                </div>
              </div>

              {reason && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Reason</p>
                  <p className="text-sm text-gray-900 bg-yellow-50 p-3 rounded">{reason}</p>
                </div>
              )}

              {Object.keys(sanitizedRawRef).length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Raw Reference</p>
                  <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-auto">
                    {JSON.stringify(sanitizedRawRef, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

