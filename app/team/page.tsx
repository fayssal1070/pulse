import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AppShell from '@/components/app-shell'
import InviteForm from '@/components/invite-form'

export default async function TeamPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)

  if (!activeOrg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No active organization found.</p>
          <Link href="/organizations/new" className="text-blue-600 hover:text-blue-700">
            Create an organization
          </Link>
        </div>
      </div>
    )
  }

  // Récupérer les membres et les invitations de l'organisation active
  const members = await prisma.membership.findMany({
    where: { orgId: activeOrg.id },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const invitations = await prisma.invitation.findMany({
    where: {
      orgId: activeOrg.id,
      acceptedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Récupérer le rôle de l'utilisateur dans cette organisation
  const userMembership = members.find((m) => m.userId === user.id)
  const userRole = userMembership?.role || 'member'

  const hasActiveAWS = false

  return (
    <AppShell organizations={organizations} activeOrgId={activeOrg?.id || null} hasActiveAWS={hasActiveAWS}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Team Management - {activeOrg.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Your role: {userRole}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Inviter un membre (seulement pour les owners) */}
            {userRole === 'owner' && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="text-md font-medium text-gray-900 mb-3">Invite Member</h4>
                <InviteForm organizationId={activeOrg.id} />
              </div>
            )}

            {/* Liste des membres */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Members</h4>
              {members.length === 0 ? (
                <p className="text-gray-500 text-sm">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.user.email}</p>
                        <p className="text-xs text-gray-500">Role: {member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invitations en attente (seulement pour les owners) */}
            {userRole === 'owner' && invitations.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Pending Invitations</h4>
                <div className="space-y-2">
                  {invitations.map((invitation) => {
                    const isExpired = new Date() > invitation.expiresAt
                    return (
                      <div
                        key={invitation.id}
                        className={`flex justify-between items-center py-2 border-b border-gray-100 last:border-0 ${
                          isExpired ? 'opacity-50' : ''
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                          <p className="text-xs text-gray-500">
                            {isExpired
                              ? 'Expired'
                              : `Expires: ${new Date(invitation.expiresAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
