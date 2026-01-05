import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { isAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import WebhooksAdminClient from '@/components/webhooks-admin-client'
import { prisma } from '@/lib/prisma'

export default async function WebhooksAdminPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/admin/integrations/webhooks' })
  const isAdminUser = await isAdmin()

  if (!isAdminUser) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard?error=admin_required')
  }

  // Fetch webhooks
  const webhooks = await prisma.orgWebhook.findMany({
    where: { orgId: activeOrg.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      enabled: true,
      events: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return (
    <AppShell organizations={organizations} activeOrgId={activeOrg.id} isAdmin={isAdminUser} needsOnboarding={false}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6" data-testid="webhooks-page-title">
            Webhooks
          </h1>
          <WebhooksAdminClient organizationId={activeOrg.id} initialWebhooks={webhooks} />
        </div>
      </div>
    </AppShell>
  )
}

