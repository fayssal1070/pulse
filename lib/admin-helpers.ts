import { auth } from '@/auth'
import { getActiveOrganization } from '@/lib/active-org'
import { getUserRole } from '@/lib/auth/rbac'

/**
 * Check if the current user is an admin based on ADMIN_EMAILS environment variable
 * ADMIN_EMAILS should be a comma-separated list of email addresses
 * Example: ADMIN_EMAILS=admin@example.com,owner@example.com
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.email) {
    return false
  }

  const adminEmails = process.env.ADMIN_EMAILS
  if (!adminEmails) {
    // If ADMIN_EMAILS is not set, no one is an admin
    return false
  }

  const emailList = adminEmails
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0)

  return emailList.includes(session.user.email.toLowerCase())
}

/**
 * Check if the current user is a finance role in the active organization
 */
export async function isFinance(): Promise<boolean> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return false
    }

    // Check if admin (admins also have finance access)
    const adminUser = await isAdmin()
    if (adminUser) {
      return true
    }

    const activeOrg = await getActiveOrganization(session.user.id)
    if (!activeOrg) {
      return false
    }

    const role = await getUserRole(activeOrg.id)
    return role === 'finance' || role === 'admin'
  } catch {
    return false
  }
}

/**
 * Check if the current user is a manager role in the active organization
 */
export async function isManager(): Promise<boolean> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return false
    }

    // Check if admin (admins also have manager access)
    const adminUser = await isAdmin()
    if (adminUser) {
      return true
    }

    const activeOrg = await getActiveOrganization(session.user.id)
    if (!activeOrg) {
      return false
    }

    const role = await getUserRole(activeOrg.id)
    return role === 'manager' || role === 'finance' || role === 'admin'
  } catch {
    return false
  }
}

/**
 * Require admin access, throw error if not admin
 * Use this in API routes or server components
 */
export async function requireAdmin() {
  const isAdminUser = await isAdmin()
  if (!isAdminUser) {
    throw new Error('Admin access required')
  }
}





