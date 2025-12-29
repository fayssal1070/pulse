import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import AppShell from '@/components/app-shell'
import NotificationSettingsClient from '@/components/notification-settings-client'

export default async function NotificationSettingsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)
  const hasActiveAWS = false

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg?.id || null}
      hasActiveAWS={hasActiveAWS}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={false}
    >
      <NotificationSettingsClient />
    </AppShell>
  )
}
