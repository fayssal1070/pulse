/**
 * RBAC (Role-Based Access Control) helpers
 * Roles: admin, finance, manager, user
 */

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin-helpers'

export type Role = 'admin' | 'finance' | 'manager' | 'user'

/**
 * Get user's role in an organization
 */
export async function getUserRole(orgId: string): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // Check if admin (global admin via ADMIN_EMAILS)
  const adminUser = await isAdmin()
  if (adminUser) {
    return 'admin'
  }

  // Get membership role
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId,
      },
    },
    select: {
      role: true,
    },
  })

  if (!membership) {
    throw new Error('User is not a member of this organization')
  }

  // Map existing roles to new RBAC roles
  // "owner" -> "admin", "member" -> "user" (default)
  const roleMap: Record<string, Role> = {
    owner: 'admin',
    admin: 'admin',
    finance: 'finance',
    manager: 'manager',
    member: 'user',
    user: 'user',
  }

  return roleMap[membership.role.toLowerCase()] || 'user'
}

/**
 * Require a specific role (throws if not met)
 */
export async function requireRole(orgId: string, requiredRole: Role | Role[]): Promise<Role> {
  const userRole = await getUserRole(orgId)
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

  // Role hierarchy: admin > finance > manager > user
  const roleHierarchy: Record<Role, number> = {
    admin: 4,
    finance: 3,
    manager: 2,
    user: 1,
  }

  const userLevel = roleHierarchy[userRole]
  const requiredLevel = Math.max(...roles.map(r => roleHierarchy[r]))

  if (userLevel < requiredLevel) {
    throw new Error(`Access denied. Required role: ${roles.join(' or ')}, your role: ${userRole}`)
  }

  return userRole
}

/**
 * Check if user can view a specific scope
 */
export async function canViewScope(
  orgId: string,
  scopeType: 'ORG' | 'TEAM' | 'PROJECT' | 'APP' | 'CLIENT',
  scopeId?: string | null
): Promise<boolean> {
  try {
    const role = await getUserRole(orgId)

    // Admin and finance can view everything
    if (role === 'admin' || role === 'finance') {
      return true
    }

    // Manager can view org and their team/project
    if (role === 'manager') {
      if (scopeType === 'ORG') {
        return true
      }
      // TODO: Check if manager belongs to the team/project
      // For now, allow managers to view any scope
      return true
    }

    // User can only view their own scope (limited)
    if (role === 'user') {
      if (scopeType === 'ORG') {
        return true // Can view org-level data
      }
      // TODO: Check if user belongs to the team/project
      // For now, allow users to view org-level only
      return false
    }

    return false
  } catch (error) {
    return false
  }
}

/**
 * Check if user can manage budgets
 */
export async function canManageBudgets(
  orgId: string,
  scopeType?: 'ORG' | 'TEAM' | 'PROJECT' | 'APP' | 'CLIENT',
  scopeId?: string | null
): Promise<boolean> {
  try {
    const role = await getUserRole(orgId)

    // Admin can manage all budgets
    if (role === 'admin') {
      return true
    }

    // Finance can manage org-level budgets
    if (role === 'finance') {
      return scopeType === 'ORG' || !scopeType
    }

    // Manager can manage budgets for their team/project
    if (role === 'manager') {
      if (scopeType === 'ORG') {
        return false // Managers cannot manage org-level budgets
      }
      // TODO: Check if manager belongs to the team/project
      // For now, allow managers to create budgets for any team/project
      return true
    }

    // User cannot manage budgets
    return false
  } catch (error) {
    return false
  }
}

/**
 * Check if user can view admin pages
 */
export async function canViewAdminPages(orgId: string): Promise<boolean> {
  try {
    const role = await getUserRole(orgId)
    return role === 'admin'
  } catch (error) {
    return false
  }
}

/**
 * Check if user can view billing pages
 */
export async function canViewBilling(orgId: string): Promise<boolean> {
  try {
    const role = await getUserRole(orgId)
    return role === 'admin' || role === 'finance'
  } catch (error) {
    return false
  }
}

/**
 * Check if user can create alerts
 */
export async function canCreateAlerts(orgId: string): Promise<boolean> {
  try {
    const role = await getUserRole(orgId)
    return role === 'admin' || role === 'finance' || role === 'manager'
  } catch (error) {
    return false
  }
}

/**
 * Check if user can manage directory (Teams, Projects, Apps, Clients)
 */
export async function canManageDirectory(orgId: string): Promise<boolean> {
  try {
    const role = await getUserRole(orgId)
    return role === 'admin' || role === 'finance' || role === 'manager'
  } catch (error) {
    return false
  }
}

