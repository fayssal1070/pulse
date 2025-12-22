import { requireAuth } from '@/lib/auth-helpers'
import { findInvitationByToken, acceptInvitation } from '@/lib/invitations'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AcceptInvitationForm from '@/components/accept-invitation-form'

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await findInvitationByToken(token)

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h2>
          <p className="text-gray-600 mb-4">This invitation link is invalid or has been removed.</p>
          <Link href="/login" className="text-blue-600 hover:text-blue-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (invitation.acceptedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invitation Already Accepted</h2>
          <p className="text-gray-600 mb-4">This invitation has already been accepted.</p>
          <Link href="/login" className="text-blue-600 hover:text-blue-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (new Date() > invitation.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invitation Expired</h2>
          <p className="text-gray-600 mb-4">
            This invitation expired on {new Date(invitation.expiresAt).toLocaleDateString()}.
          </p>
          <Link href="/login" className="text-blue-600 hover:text-blue-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Join {invitation.organization.name}</h2>
        <p className="text-gray-600 mb-4">
          You have been invited to join <strong>{invitation.organization.name}</strong> as a member.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Please log in or create an account to accept this invitation.
        </p>
        <AcceptInvitationForm token={token} organizationEmail={invitation.email} />
      </div>
    </div>
  )
}

