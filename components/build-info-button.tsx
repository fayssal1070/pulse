import Link from 'next/link'
import { Info } from 'lucide-react'

/**
 * BuildInfoButton - Admin-only link to build info page
 * 
 * IMPORTANT: This component is only rendered server-side if user is admin.
 * No gating logic here - if this component is mounted, user is admin.
 */
export default function BuildInfoButton() {
  return (
    <Link
      href="/admin/build-info"
      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      title="Build info (Admin only)"
    >
      <Info className="h-4 w-4 mr-1.5" />
      Build info
    </Link>
  )
}
