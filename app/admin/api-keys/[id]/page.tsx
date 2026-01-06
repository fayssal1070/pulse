import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { isAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import ApiKeyDetailsClient from '@/components/api-key-details-client'

export default async function ApiKeyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/admin/api-keys' })
  const isAdminUser = await isAdmin()

  const { id } = await params

  return (
    <AppShell organizations={organizations} activeOrgId={activeOrg.id} isAdmin={isAdminUser} needsOnboarding={false}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <ApiKeyDetailsClient organizationId={activeOrg.id} keyId={id} />
        </div>
      </div>
    </AppShell>
  )
}

