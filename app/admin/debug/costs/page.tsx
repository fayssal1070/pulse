import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DebugCostsPage() {
  const user = await requireAuth()
  
  // Check admin access
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard?error=admin_required')
  }

  const orgId = await getActiveOrganizationId(user.id)

  if (!orgId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Debug Costs</h1>
            <p className="text-gray-600">No active organization found.</p>
            <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Get count
  const count = await prisma.costRecord.count({
    where: { orgId },
  })

  // Get min/max date
  const dateStats = await prisma.costRecord.aggregate({
    where: { orgId },
    _min: { date: true },
    _max: { date: true },
  })

  // Get sum for last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [sum30d, count30d, awsAccount] = await Promise.all([
    prisma.costRecord.aggregate({
      where: {
        orgId,
        date: { gte: thirtyDaysAgo },
      },
      _sum: {
        amountEUR: true,
      },
    }),
    prisma.costRecord.count({
      where: {
        orgId,
        date: { gte: thirtyDaysAgo },
      },
    }),
    prisma.cloudAccount.findFirst({
      where: {
        orgId,
        provider: 'AWS',
        connectionType: 'COST_EXPLORER',
        status: 'active',
      },
      select: {
        id: true,
        lastSyncedAt: true,
        notes: true,
      },
      orderBy: {
        lastSyncedAt: 'desc',
      },
    }),
  ])

  // Parse lastAwsFetch from CloudAccount notes
  let lastAwsFetch = null
  if (awsAccount?.notes) {
    try {
      const notes = JSON.parse(awsAccount.notes)
      if (notes.lastAwsFetch) {
        lastAwsFetch = notes.lastAwsFetch
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Enrich lastAwsFetch with debug fields if AWS_SYNC_DEBUG is enabled
  const isDebug = process.env.AWS_SYNC_DEBUG === '1' || process.env.AWS_SYNC_DEBUG === 'true'
  const enrichedLastAwsFetch = lastAwsFetch && isDebug ? {
    ...lastAwsFetch,
    start: lastAwsFetch.timePeriod?.start,
    end: lastAwsFetch.timePeriod?.end,
    metric: lastAwsFetch.metric,
    granularity: lastAwsFetch.granularity || 'DAILY',
    firstResultTotalAmount: lastAwsFetch.firstResultTotal?.amount,
    firstResultTotalUnit: lastAwsFetch.firstResultTotal?.unit,
    sampleGroups: lastAwsFetch.sampleGroups || [],
    computedTotalFromAws: lastAwsFetch.computedTotalFromAws || lastAwsFetch.totalFromAws,
  } : lastAwsFetch

  const data = {
    orgId,
    count,
    minDate: dateStats._min.date?.toISOString() || null,
    maxDate: dateStats._max.date?.toISOString() || null,
    sum_30d: sum30d._sum.amountEUR || 0,
    count_30d: count30d,
    awsAccount: awsAccount ? {
      id: awsAccount.id,
      lastSyncedAt: awsAccount.lastSyncedAt?.toISOString() || null,
    } : null,
    lastAwsFetch: enrichedLastAwsFetch,
    deployment: {
      env: process.env.VERCEL_ENV || 'development',
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      commitShaShort: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').substring(0, 7),
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Debug Costs</h1>
          <p className="text-sm text-gray-500 mt-2">Admin-only diagnostic page for cost data</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
              Sum (30 days)
            </p>
            <p className="text-2xl font-bold text-blue-900">
              {data.sum_30d.toFixed(2)} EUR
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
              Count (30 days)
            </p>
            <p className="text-2xl font-bold text-green-900">
              {data.count_30d}
            </p>
          </div>
        </div>

        {/* Full JSON */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Full Response</h2>
          <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}




