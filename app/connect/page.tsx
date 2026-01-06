import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import AppShell from '@/components/app-shell'
import ConnectPageClient from '@/components/connect-page-client'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin-helpers'

export default async function ConnectPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/connect' })
  const isAdminUser = await isAdmin()

  const activeOrgId = activeOrg.id

  // Check if user has any API keys
  const hasApiKeys = await prisma.aiGatewayKey.count({
    where: { 
      orgId: activeOrgId,
      status: 'active',
      enabled: true,
    },
  }) > 0

  // Get base URL from environment or use default
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/api/v1`
    : 'https://pulse-sigma-eight.vercel.app/api/v1'

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrgId}
      isAdmin={isAdminUser}
      needsOnboarding={false}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6" data-testid="connect-page-title">
            Developer Connect
          </h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Organization:</strong> {activeOrg.name}
              {!hasApiKeys && (
                <>
                  {' '}— <a href="/admin/api-keys" className="underline font-medium">Create an API key</a> to get started
                </>
              )}
            </p>
          </div>

          <ConnectPageClient 
            organizationId={activeOrgId}
            organizationName={activeOrg.name}
            baseUrl={baseUrl}
            hasApiKeys={hasApiKeys}
          />
        </div>
      </div>
    </AppShell>
  )
}
