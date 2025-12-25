interface AdminDeploymentInfoProps {
  isAdmin: boolean
  vercelEnv?: string
  commitSha?: string
}

export default function AdminDeploymentInfo({ 
  isAdmin, 
  vercelEnv = 'development',
  commitSha = 'local'
}: AdminDeploymentInfoProps) {
  if (!isAdmin) {
    return null
  }

  // Short commit hash (first 7 characters)
  const shortSha = commitSha.substring(0, 7)

  return (
    <footer className="mt-8 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
        <span>
          <span className="font-medium">Env:</span>{' '}
          <span
            className={
              vercelEnv === 'production'
                ? 'text-green-600 font-semibold'
                : vercelEnv === 'preview'
                ? 'text-yellow-600 font-semibold'
                : 'text-gray-500'
            }
          >
            {vercelEnv}
          </span>
        </span>
        <span>•</span>
        <span>
          <span className="font-medium">Commit:</span>{' '}
          <code className="font-mono text-gray-500">{shortSha}</code>
        </span>
      </div>
    </footer>
  )
}

