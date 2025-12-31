import { getActiveOrganization } from '@/lib/active-org'
import { redirect } from 'next/navigation'

interface RequireActiveOrgOptions {
  redirectTo?: string
  nextPath?: string
}

/**
 * Require an active organization or redirect to organization selection
 * Returns the active organization if it exists, otherwise redirects
 */
export async function requireActiveOrgOrRedirect(
  userId: string,
  options: RequireActiveOrgOptions = {}
): Promise<{ id: string; name: string }> {
  const activeOrg = await getActiveOrganization(userId)

  if (!activeOrg) {
    const redirectPath = options.redirectTo || '/organizations/new'
    const nextParam = options.nextPath ? `?next=${encodeURIComponent(options.nextPath)}` : ''
    redirect(`${redirectPath}${nextParam}`)
  }

  return {
    id: activeOrg.id,
    name: activeOrg.name,
  }
}

