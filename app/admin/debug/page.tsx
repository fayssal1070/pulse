import AppShell from '@/components/app-shell'
import { DebugDbConnectionClient } from '@/components/admin/debug-db-connection-client'
import { getActiveOrganization } from '@/lib/active-org'
import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'

export default async function AdminDebugPage() {
  const user = await requireAuth()
  const activeOrg = await getActiveOrganization(user.id)
  
  if (!activeOrg) {
    return <div>No active organization</div>
  }

  await requireRole(activeOrg.id, 'admin')

  // Get organizations for AppShell
  const { prisma } = await import('@/lib/prisma')
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: true },
  })
  const organizations = memberships.map(m => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
  }))

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      isAdmin={true}
    >
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Database Connection Debug</h1>
        <DebugDbConnectionClient />
      </div>
    </AppShell>
  )
}

