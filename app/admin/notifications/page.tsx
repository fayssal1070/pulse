import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { isAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import NotificationDeliveriesClient from '@/components/notification-deliveries-client'

export default async function NotificationDeliveriesPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/admin/notifications' })
  const isAdminUser = await isAdmin()

  if (!isAdminUser) {
    return (
      <AppShell organizations={organizations} activeOrgId={activeOrg.id} isAdmin={false} needsOnboarding={false}>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Access Denied</h1>
            <p className="text-gray-600">You must be an admin to access this page.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell organizations={organizations} activeOrgId={activeOrg.id} isAdmin={isAdminUser} needsOnboarding={false}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6" data-testid="notifications-deliveries-title">
            Notification Deliveries
          </h1>
          <NotificationDeliveriesClient organizationId={activeOrg.id} />
        </div>
      </div>
    </AppShell>
  )
}

