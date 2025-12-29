'use client'

import Link from 'next/link'

export default function NotificationSettingsLink() {
  return (
    <Link
      href="/settings/notifications"
      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    >
      Manage Notification Settings
    </Link>
  )
}

