import { requireAuth } from '@/lib/auth-helpers'
import { isAdmin } from '@/lib/admin-helpers'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import HealthPageClient from '@/components/admin/health-page-client'

export default async function AdminHealthPage() {
  const user = await requireAuth()
  const adminUser = await isAdmin()

  if (!adminUser) {
    redirect('/dashboard?error=admin_required')
  }

  return (
    <AppShell
      organizations={[]}
      activeOrgId={null}
      hasActiveAWS={false}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={adminUser}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <HealthPageClient />
        </div>
      </div>
    </AppShell>
  )
}

