'use client'

interface BuildInfoBadgeProps {
  commitSha?: string
  env?: string
}

export default function BuildInfoBadge({ commitSha, env }: BuildInfoBadgeProps) {
  const displayCommit = commitSha?.substring(0, 7) || 'local'
  const displayEnv = env || 'local'

  return (
    <div className="text-xs text-gray-500 font-mono px-2 py-1 bg-gray-100 rounded border border-gray-200 whitespace-nowrap">
      <span className="text-gray-600">{displayEnv}</span>
      {' • '}
      <span className="text-blue-600 font-semibold">{displayCommit}</span>
    </div>
  )
}




