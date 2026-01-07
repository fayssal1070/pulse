import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { isAdmin } from '@/lib/admin-helpers'
import Link from 'next/link'
import PublicNav from '@/components/public-nav'
import PublicFooter from '@/components/public-footer'

export default async function BuildInfoPage() {
  const user = await requireAuth()
  const adminStatus = await isAdmin()

  if (!adminStatus) {
    redirect('/dashboard?error=admin_required')
  }

  // Get build information
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const commitShaShort = commitSha.substring(0, 7)
  const env = process.env.VERCEL_ENV || 'development'
  const buildTime = process.env.VERCEL ? new Date().toISOString() : new Date().toISOString()
  const appVersion = process.env.APP_VERSION || '1.0.0'

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-grow bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Build Information
            </h1>
            <p className="text-xl text-gray-600">
              Current deployment information (Admin only)
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Commit Hash */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">
                  Commit Hash
                </p>
                <p className="text-3xl font-bold text-blue-900 font-mono mb-2">
                  {commitShaShort}
                </p>
                <p className="text-xs text-blue-700 font-mono break-all">
                  {commitSha}
                </p>
              </div>

              {/* Environment */}
              <div className={`border rounded-lg p-6 ${
                env === 'production'
                  ? 'bg-green-50 border-green-200'
                  : env === 'preview'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                  env === 'production'
                    ? 'text-green-600'
                    : env === 'preview'
                    ? 'text-yellow-600'
                    : 'text-gray-600'
                }`}>
                  Environment
                </p>
                <p className={`text-3xl font-bold ${
                  env === 'production'
                    ? 'text-green-900'
                    : env === 'preview'
                    ? 'text-yellow-900'
                    : 'text-gray-900'
                }`}>
                  {env}
                </p>
              </div>

              {/* Build Time */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Build Time
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(buildTime).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short',
                  })}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {buildTime}
                </p>
              </div>

              {/* App Version */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-2">
                  App Version
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {appVersion}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Additional Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-800 overflow-x-auto">
                <pre>{JSON.stringify({
                  commitSha,
                  commitShaShort,
                  env,
                  buildTime,
                  appVersion,
                  vercel: process.env.VERCEL === '1',
                  vercelUrl: process.env.VERCEL_URL || null,
                }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}






