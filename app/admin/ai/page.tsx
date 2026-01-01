import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import { getUserOrganizations } from '@/lib/organizations'
import AiAdminPanel from '@/components/ai-admin-panel'
import Link from 'next/link'

export default async function AdminAIPage() {
  const user = await requireAuth()
  const isAdminUser = await isAdmin()

  if (!isAdminUser) {
    redirect('/dashboard')
  }

  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)

  if (!activeOrg) {
    redirect('/organizations/new')
  }

  // Get AI keys
  const keys = await prisma.aiGatewayKey.findMany({
    where: {
      orgId: activeOrg.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get AI policies
  const policies = await prisma.aiPolicy.findMany({
    where: {
      orgId: activeOrg.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get recent AI requests (last 10)
  const recentRequests = await prisma.aiRequestLog.findMany({
    where: {
      orgId: activeOrg.id,
    },
    orderBy: {
      occurredAt: 'desc',
    },
    take: 10,
    select: {
      id: true,
      occurredAt: true,
      model: true,
      provider: true,
      totalTokens: true,
      estimatedCostEur: true,
      statusCode: true,
      userId: true,
    },
  })

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Gateway Admin</h2>
              <p className="text-sm text-gray-500 mt-1">Manage AI keys, policies, and test requests</p>
            </div>
            <Link
              href="/governance"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              View Governance
            </Link>
          </div>

          <AiAdminPanel
            orgId={activeOrg.id}
            initialKeys={keys}
            initialPolicies={policies}
            recentRequests={recentRequests}
          />
        </div>
      </div>
    </AppShell>
  )
}

