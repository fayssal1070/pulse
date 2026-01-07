export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-4 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900">Authentication error</h1>
        <p className="text-gray-600 text-sm">
          Something went wrong during authentication. Please try again or sign in again.
        </p>
        <p className="text-xs text-gray-400">
          If this keeps happening, check the logs on Vercel for details (search for
          &quot;[auth][error]&quot; entries).
        </p>
      </div>
    </div>
  )
}







