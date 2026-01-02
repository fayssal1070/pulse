import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { isAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import DirectoryClient from '@/components/directory/directory-client'

export default async function DirectoryPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })
  const isAdminUser = await isAdmin()

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
          <DirectoryClient />
        </div>
      </div>
    </AppShell>
  )
}

