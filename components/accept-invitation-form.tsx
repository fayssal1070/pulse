'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function AcceptInvitationForm({
  token,
  organizationEmail,
}: {
  token: string
  organizationEmail: string
}) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailMatch, setEmailMatch] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      const userEmail = session.user.email.toLowerCase()
      const inviteEmail = organizationEmail.toLowerCase()
      setEmailMatch(userEmail === inviteEmail)
    }
  }, [session, status, organizationEmail])

  const handleAccept = async () => {
    if (status !== 'authenticated') {
      router.push(`/login?callbackUrl=/invitations/${token}`)
      return
    }

    if (emailMatch === false) {
      setError(`This invitation is for ${organizationEmail}, but you are logged in as ${session?.user?.email}`)
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to accept invitation')
        return
      }

      // Rediriger vers le dashboard
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  if (status === 'unauthenticated') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Please log in with the email <strong>{organizationEmail}</strong> to accept this invitation.
        </p>
        <Link
          href={`/login?callbackUrl=/invitations/${token}`}
          className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center"
        >
          Login to Accept
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {emailMatch === false && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          This invitation is for <strong>{organizationEmail}</strong>, but you are logged in as{' '}
          <strong>{session?.user?.email}</strong>. Please log out and log in with the correct email.
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
      )}

      {emailMatch === true && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
          Email matches! You can accept this invitation.
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={loading || emailMatch === false}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Accepting...' : 'Accept Invitation'}
      </button>
    </div>
  )
}


