import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { isOrganizationOwner } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/logout-button'
import LeadsTable from '@/components/leads-table'

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; page?: string }>
}) {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)

  // Check if user is owner of at least one organization
  const isOwner = await Promise.all(
    organizations.map(org => isOrganizationOwner(org.id, user.id))
  ).then(results => results.some(r => r))

  if (!isOwner) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const showArchived = params.archived === 'true'
  const page = parseInt(params.page || '1', 10)
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const leads = await prisma.lead.findMany({
    where: {
      archived: showArchived,
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip,
    take: pageSize,
  })

  const totalLeads = await prisma.lead.count({
    where: {
      archived: showArchived,
    },
  })

  const totalPages = Math.ceil(totalLeads / pageSize)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                PULSE
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">Admin / Leads</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Leads Management</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage waitlist submissions and leads
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={`/admin/leads?archived=${!showArchived}&page=1`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {showArchived ? 'Show Active' : 'Show Archived'}
              </Link>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Total: <span className="font-medium">{totalLeads}</span> leads
                  {showArchived ? ' (archived)' : ' (active)'}
                </p>
              </div>
            </div>
            <LeadsTable leads={leads} />
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  {page > 1 && (
                    <Link
                      href={`/admin/leads?archived=${showArchived}&page=${page - 1}`}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/admin/leads?archived=${showArchived}&page=${page + 1}`}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

