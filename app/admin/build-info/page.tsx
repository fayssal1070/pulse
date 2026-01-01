import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import Link from 'next/link'

export default async function BuildInfoPage() {
  const user = await requireAuth()
  
  // Check admin access
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard?error=admin_required')
  }

  // Get commit hash from environment variable
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const commitShaShort = commitSha.substring(0, 7)
  
  // Get environment
  const env = process.env.VERCEL_ENV || 'development'
  
  // Build timestamp
  const buildTimestamp = process.env.VERCEL ? new Date().toISOString() : new Date().toISOString()
  
  // App version
  const appVersion = process.env.APP_VERSION || '1.0.0'
  
  // Additional info
  const vercelUrl = process.env.VERCEL_URL || null
  const vercel = process.env.VERCEL === '1'

  const data = {
    commitSha,
    commitShaShort,
    env,
    buildTimestamp,
    appVersion,
    vercel,
    vercelUrl,
    deployment: {
      commit: commitShaShort,
      environment: env,
      timestamp: buildTimestamp,
      version: appVersion,
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Build Information</h1>
          <p className="text-sm text-gray-500 mt-2">Admin-only build and deployment information</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
              Commit
            </p>
            <p className="text-2xl font-bold text-blue-900 font-mono">
              {data.commitShaShort}
            </p>
            <p className="text-xs text-blue-700 mt-1 font-mono">
              {data.commitSha}
            </p>
          </div>
          <div className={`border rounded-lg p-4 ${
            data.env === 'production'
              ? 'bg-green-50 border-green-200'
              : data.env === 'preview'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
              data.env === 'production'
                ? 'text-green-600'
                : data.env === 'preview'
                ? 'text-yellow-600'
                : 'text-gray-600'
            }`}>
              Environment
            </p>
            <p className={`text-2xl font-bold ${
              data.env === 'production'
                ? 'text-green-900'
                : data.env === 'preview'
                ? 'text-yellow-900'
                : 'text-gray-900'
            }`}>
              {data.env}
            </p>
          </div>
        </div>

        {/* Build timestamp */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
            Build Time
          </p>
          <p className="text-sm text-gray-900">
            {new Date(data.buildTimestamp).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short',
            })}
          </p>
        </div>

        {/* App Version */}
        {data.appVersion && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
              App Version
            </p>
            <p className="text-2xl font-bold text-purple-900">
              {data.appVersion}
            </p>
          </div>
        )}

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




