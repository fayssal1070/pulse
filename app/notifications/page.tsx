import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AppShell from '@/components/app-shell'
import TelegramForm from '@/components/telegram-form'
import MarkNotificationReadButton from '@/components/mark-notification-read-button'
import { isAdmin } from '@/lib/admin-helpers'

export default async function NotificationsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)
  const isAdminUser = await isAdmin()

  // Get in-app notifications for the user and active org
  const notifications = activeOrg
    ? await prisma.inAppNotification.findMany({
        where: {
          orgId: activeOrg.id,
          OR: [{ userId: user.id }, { userId: null }], // User-specific or org-wide
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : []

  const unreadCount = notifications.filter((n) => !n.readAt).length

  // Récupérer l'organisation avec la config Telegram
  const orgWithTelegram = activeOrg
    ? await prisma.organization.findUnique({
        where: { id: activeOrg.id },
        select: {
          id: true,
          name: true,
          telegramChatId: true,
          telegramBotToken: true,
        },
      })
    : null

  const hasActiveAWS = false

  return (
    <AppShell 
      organizations={organizations} 
      activeOrgId={activeOrg?.id || null} 
      hasActiveAWS={hasActiveAWS}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeOrg
                ? `In-app notifications for ${activeOrg.name}${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`
                : 'Select an organization to view notifications'}
            </p>
          </div>

          {/* In-App Notifications */}
          {activeOrg && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">In-App Notifications</h3>
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-sm">No notifications yet</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded border ${
                        notification.readAt
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{notification.title}</p>
                          <p className="text-sm text-gray-700 mt-1">{notification.body}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.readAt && (
                          <MarkNotificationReadButton notificationId={notification.id} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Telegram Configuration */}
          {orgWithTelegram ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Telegram Configuration</h3>
              <TelegramForm organization={orgWithTelegram} />
            </div>
          ) : activeOrg ? (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Telegram configuration available for organization owners.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Please select an organization first.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

