import Link from 'next/link'
import { Bug } from 'lucide-react'
import BuildInfoButton from './build-info-button'

/**
 * DebugCostsButton - Admin-only link to debug costs page
 * 
 * IMPORTANT: This component is only rendered server-side if user is admin.
 * No gating logic here - if this component is mounted, user is admin.
 * This ensures SSR/CSR markup match (no hydration mismatch).
 */
export default function DebugCostsButton() {
  return (
    <div className="flex items-center space-x-2">
      <Link
        href="/admin/debug/costs"
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        title="Debug costs data (Admin only)"
      >
        <Bug className="h-4 w-4 mr-1.5" />
        Debug costs
      </Link>
      <BuildInfoButton />
    </div>
  )
}
