'use client'

import { useState, useEffect } from 'react'
import { fetchJson } from '@/lib/http/fetch-json'
import { UpgradeRequiredError } from '@/lib/http/upgrade-error'
import { UpgradeRequired } from '@/components/billing/upgrade-required'
import Link from 'next/link'

interface Member {
  id: string
  userId: string
  email: string
  role: string
  status: string
  activatedAt: string | null
  invitedAt: string | null
}

interface SeatsInfo {
  used: number
  limit: number
  available: number
  enforcement: boolean
}

interface MembersPageClientProps {
  organizationId: string
}

export default function MembersPageClient({ organizationId }: MembersPageClientProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [seatsInfo, setSeatsInfo] = useState<SeatsInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState<UpgradeRequiredError | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    loadData()
  }, [organizationId])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [seatsRes, membersData] = await Promise.all([
        fetchJson<SeatsInfo>('/api/billing/seats'),
        fetchJson<{ members: Member[] }>('/api/organizations/' + organizationId + '/members'),
      ])

      setSeatsInfo(seatsRes)
      setMembers(membersData.members || [])
    } catch (err: any) {
      if (err instanceof UpgradeRequiredError) {
        setUpgradeError(err)
      } else {
        setError(err.message || 'Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setUpgradeError(null)
    setError(null)

    try {
      await fetchJson('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })

      setInviteEmail('')
      setShowInviteForm(false)
      loadData() // Reload to show new invitation
    } catch (err: any) {
      if (err instanceof UpgradeRequiredError) {
        setUpgradeError(err)
      } else {
        setError(err.message || 'Failed to send invitation')
      }
    } finally {
      setInviting(false)
    }
  }

  const isAtLimit = seatsInfo ? seatsInfo.available <= 0 : false

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage team members and their access
        </p>
      </div>

      {/* Seats Header */}
      {seatsInfo && (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Seats Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {seatsInfo.used} / {seatsInfo.limit}
              </p>
              {isAtLimit && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2">
                  Seat limit reached
                </span>
              )}
            </div>
            {isAtLimit && (
              <Link
                href="/billing"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Required Banner */}
      {upgradeError && (
        <UpgradeRequired
          message={upgradeError.message}
          feature={upgradeError.feature}
          plan={upgradeError.plan}
          requiredPlan={upgradeError.required}
        />
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Invite Member Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Invite Member</h2>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            disabled={isAtLimit}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              isAtLimit
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showInviteForm ? 'Cancel' : '+ Invite Member'}
          </button>
        </div>

        {isAtLimit && !showInviteForm && (
          <p className="text-sm text-gray-600 mb-4">
            Seat limit reached. Upgrade your plan to invite more members.
          </p>
        )}

        {showInviteForm && (
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Members</h2>
        {loading ? (
          <p className="text-sm text-gray-600">Loading...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-600">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{member.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{member.role}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : member.status === 'invited'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {member.activatedAt
                        ? new Date(member.activatedAt).toLocaleDateString()
                        : member.invitedAt
                        ? 'Invited'
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

