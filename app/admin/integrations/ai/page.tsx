import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { getUserOrganizations } from '@/lib/organizations'
import { isAdmin } from '@/lib/admin-helpers'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import AiProvidersAdminClient from '@/components/admin/ai-providers-admin-client'

export default async function AIIntegrationsPage() {
  const user = await requireAuth()

  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard?error=admin_required')
  }

  const activeOrg = await getActiveOrganization(user.id)
  if (!activeOrg) {
    redirect('/dashboard')
  }

  const organizations = await getUserOrganizations(user.id)
  const isAdminUser = await isAdmin()

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Provider Integrations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure AI providers (OpenAI, Anthropic, xAI, Google, Mistral) and model routes
          </p>
        </div>

        <AiProvidersAdminClient organizationId={activeOrg.id} />
      </div>
    </AppShell>
  )
}

