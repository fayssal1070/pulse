import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { isAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import ApiKeysAdminClient from '@/components/api-keys-admin-client'
import { prisma } from '@/lib/prisma'

export default async function ApiKeysAdminPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/admin/api-keys' })

  // Check permissions (admin/finance/manager can access)
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId: activeOrg.id,
      },
    },
    select: { role: true },
  })

  const role = membership?.role || 'member'
  const isAdminUser = await isAdmin()
  const canManageKeys = role === 'admin' || role === 'owner' || role === 'finance' || role === 'manager'

  if (!canManageKeys) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard?error=insufficient_permissions')
  }

  // Fetch directory items for defaults dropdowns
  const [apps, projects, clients, teams] = await Promise.all([
    prisma.app.findMany({ where: { orgId: activeOrg.id }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ where: { orgId: activeOrg.id }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ where: { orgId: activeOrg.id }, orderBy: { name: 'asc' } }),
    prisma.team.findMany({ where: { orgId: activeOrg.id }, orderBy: { name: 'asc' } }),
  ])

  return (
    <AppShell organizations={organizations} activeOrgId={activeOrg.id} isAdmin={isAdminUser} needsOnboarding={false}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6" data-testid="api-keys-admin-page-title">
            API Keys
          </h1>
          <ApiKeysAdminClient
            organizationId={activeOrg.id}
            canRotateAny={role === 'admin' || role === 'owner'}
            directory={{ apps, projects, clients, teams }}
          />
        </div>
      </div>
    </AppShell>
  )
}

