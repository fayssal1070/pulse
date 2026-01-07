import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { requireAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import MembersPageClient from '@/components/settings/members-page-client'

export default async function MembersPage() {
  const user = await requireAuth()
  await requireAdmin()

  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/settings/members' })

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      isAdmin={true}
      needsOnboarding={false}
    >
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <MembersPageClient organizationId={activeOrg.id} />
        </div>
      </div>
    </AppShell>
  )
}

