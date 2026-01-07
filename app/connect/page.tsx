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
          
          {/* Why Pulse Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Why route your AI traffic through Pulse?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">✓</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Unified Billing</h3>
                  <p className="text-sm text-gray-600">One invoice for all AI providers</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">✓</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Cost Control</h3>
                  <p className="text-sm text-gray-600">Set budgets and get alerts before overspending</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">✓</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Multi-Provider Routing</h3>
                  <p className="text-sm text-gray-600">Switch providers without changing code</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">✓</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Zero Vendor Lock-in</h3>
                  <p className="text-sm text-gray-600">Your code stays portable</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded border border-gray-200">
              <p className="text-sm font-mono text-gray-700 text-center">
                Your app → Pulse → OpenAI / Claude / Gemini
              </p>
              <p className="text-xs text-gray-500 text-center mt-2">
                ↓ Costs • Budgets • Alerts • Billing
              </p>
            </div>
          </div>
          
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
