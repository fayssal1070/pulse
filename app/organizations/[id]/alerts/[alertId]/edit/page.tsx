import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import EditAlertForm from './edit-alert-form'

export default async function EditAlertPage({
  params,
}: {
  params: Promise<{ id: string; alertId: string }>
}) {
  const user = await requireAuth()
  const { id, alertId } = await params
  const organization = await getOrganizationById(id, user.id)

  if (!organization) {
    redirect('/dashboard')
  }

  const alert = await prisma.alertRule.findUnique({
    where: { id: alertId },
  })

  if (!alert || alert.orgId !== id) {
    redirect(`/organizations/${id}/alerts`)
  }

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
              <Link
                href={`/organizations/${id}`}
                className="text-gray-700 hover:text-gray-900"
              >
                {organization.name}
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                href={`/organizations/${id}/alerts`}
                className="text-gray-700 hover:text-gray-900"
              >
                Alerts
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">Edit</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href={`/organizations/${id}/alerts`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
            >
              ← Back to Alerts
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">Edit Alert</h2>
            <p className="text-sm text-gray-500 mt-1">
              Update alert settings
            </p>
          </div>

          <EditAlertForm organizationId={id} alert={alert} />
        </div>
      </main>
    </div>
  )
}



