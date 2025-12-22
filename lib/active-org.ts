import { cookies } from 'next/headers'
import { getUserOrganizations } from './organizations'

const ACTIVE_ORG_COOKIE = 'pulse-active-org'

// Récupérer l'organisation active de l'utilisateur
export async function getActiveOrganization(userId: string) {
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  const organizations = await getUserOrganizations(userId)

  if (organizations.length === 0) {
    return null
  }

  // Si une seule organisation, la retourner automatiquement
  if (organizations.length === 1) {
    return organizations[0]
  }

  // Si plusieurs organisations
  if (activeOrgId) {
    const activeOrg = organizations.find((org) => org.id === activeOrgId)
    if (activeOrg) {
      return activeOrg
    }
  }

  // Par défaut, retourner la première organisation
  return organizations[0]
}

// Définir l'organisation active
export async function setActiveOrganization(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 an
    path: '/',
  })
}

// Récupérer l'ID de l'organisation active (pour les API routes)
export async function getActiveOrganizationId(userId: string): Promise<string | null> {
  const org = await getActiveOrganization(userId)
  return org?.id || null
}

