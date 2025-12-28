import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import AppShell from '@/components/app-shell'
import { isAdmin } from '@/lib/admin-helpers'
import ConnectAWSContent from './connect-aws-content'

export default async function ConnectAWSPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  const { id } = await params

  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)
  const isAdminUser = await isAdmin()

  const hasActiveAWS = await prisma.cloudAccount.count({
    where: {
      orgId: id,
      provider: 'AWS',
      status: 'active',
    },
  }) > 0

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg?.id || null}
      hasActiveAWS={hasActiveAWS}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <ConnectAWSContent />
    </AppShell>
  )
}

