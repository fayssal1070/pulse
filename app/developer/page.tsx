import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { isAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import DeveloperPortalClient from '@/components/developer-portal-client'
import { prisma } from '@/lib/prisma'

export default async function DeveloperPortalPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/developer' })
  const isAdminUser = await isAdmin()

  // Check if user is admin or manager
  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      orgId: activeOrg.id,
    },
  })

  const isManager = membership?.role === 'manager' || membership?.role === 'admin'
  const canManageKeys = isAdminUser || isManager

  if (!canManageKeys) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard?error=manager_required')
  }

  // Fetch API keys
  const keys = await prisma.aiGatewayKey.findMany({
    where: { orgId: activeOrg.id },
    include: {
      defaultApp: { select: { id: true, name: true, slug: true } },
      defaultProject: { select: { id: true, name: true } },
      defaultClient: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch apps, projects, clients for dropdowns
  const [apps, projects, clients] = await Promise.all([
    prisma.app.findMany({
      where: { orgId: activeOrg.id },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({
      where: { orgId: activeOrg.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: { orgId: activeOrg.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Get base URL (for snippets)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pulse-sigma-eight.vercel.app'

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      isAdmin={isAdminUser}
      needsOnboarding={false}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Developer Portal</h1>
          <DeveloperPortalClient
            organizationId={activeOrg.id}
            initialKeys={keys}
            apps={apps}
            projects={projects}
            clients={clients}
            baseUrl={baseUrl}
          />
        </div>
      </div>
    </AppShell>
  )
}

