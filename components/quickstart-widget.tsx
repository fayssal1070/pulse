'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface QuickstartWidgetProps {
  hasCostData: boolean
  hasAlerts: boolean
  organizationId: string | null
  hasActiveAWS?: boolean
  awsAccountInfo?: { lastSyncedAt: Date | null } | null
}

export default function QuickstartWidget({
  hasCostData,
  hasAlerts,
  organizationId,
  hasActiveAWS = false,
  awsAccountInfo = null,
}: QuickstartWidgetProps) {
  const router = useRouter()

  // If AWS is connected, show AWS-specific steps
  const steps = hasActiveAWS
    ? [
        {
          num: 1,
          label: 'AWS connected',
          completed: true,
          action: (
            <span className="text-xs text-green-600 font-medium">✓ Connected</span>
          ),
        },
        {
          num: 2,
          label: 'Auto-sync: once daily',
          completed: false, // Info step
          action: (
            <span className="text-xs text-gray-500">Enabled</span>
          ),
        },
        {
          num: 3,
          label: 'Manual: Sync Now anytime',
          completed: hasCostData, // Mark as completed if data exists
          action: organizationId ? (
            <Link
              href={`/organizations/${organizationId}/cloud-accounts`}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Sync Now →
            </Link>
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          ),
        },
        {
          num: 4,
          label: 'Create your first alert',
          completed: hasAlerts,
          action: organizationId ? (
            <Link
              href={`/organizations/${organizationId}/alerts`}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Create Alert →
            </Link>
          ) : (
            <span className="text-xs text-gray-400">Create organization first</span>
          ),
        },
      ]
    : [
        {
          num: 1,
          label: 'Download CSV template',
          completed: false, // Always show as info (can't track downloads)
          action: (
            <a
              href="/api/csv/template"
              download="pulse-import-template.csv"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Download →
            </a>
          ),
        },
        {
          num: 2,
          label: 'Learn how to export CSV from your cloud provider',
          completed: false, // Always show as info
          action: (
            <Link
              href="/help/import-csv"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View Guide →
            </Link>
          ),
        },
        {
          num: 3,
          label: 'Import your cost data',
          completed: hasCostData,
          action: organizationId ? (
            <Link
              href="/import"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Import CSV →
            </Link>
          ) : (
            <span className="text-xs text-gray-400">Create organization first</span>
          ),
        },
        {
          num: 4,
          label: 'Create your first alert',
          completed: hasAlerts,
          action: organizationId ? (
            <Link
              href={`/organizations/${organizationId}/alerts`}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Create Alert →
            </Link>
          ) : (
            <span className="text-xs text-gray-400">Create organization first</span>
          ),
        },
      ]

  // Format date on client side to avoid hydration mismatch
  const [lastSyncedFormatted, setLastSyncedFormatted] = useState<string | null>(null)
  
  useEffect(() => {
    if (awsAccountInfo?.lastSyncedAt) {
      // Format only on client side after hydration
      setLastSyncedFormatted(new Date(awsAccountInfo.lastSyncedAt).toLocaleString())
    }
  }, [awsAccountInfo?.lastSyncedAt])

  // Add sync info if AWS is connected
  const syncInfo = hasActiveAWS ? (
    <div className="mt-3 pt-3 border-t border-blue-200">
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <span className="font-medium">Auto-sync:</span> once daily
        </p>
        <p>
          <span className="font-medium">Manual:</span> Sync Now anytime
        </p>
        <p className="text-gray-500 italic">
          Note: AWS updates ~24h
        </p>
        {lastSyncedFormatted && (
          <p className="text-gray-500 mt-1">
            Last synced: {lastSyncedFormatted}
          </p>
        )}
      </div>
    </div>
  ) : null

  const completedCount = steps.filter(s => s.completed).length
  const totalSteps = steps.length

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 mb-6 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Quickstart Guide</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get started with PULSE in 4 simple steps
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{completedCount}/{totalSteps}</div>
          <div className="text-xs text-gray-500">completed</div>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.num}
            className={`flex items-center justify-between p-3 rounded-lg ${
              step.completed
                ? 'bg-green-50 border border-green-200'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : step.num <= 2
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step.completed ? '✓' : step.num}
              </div>
              <span
                className={`text-sm flex-1 ${
                  step.completed ? 'text-gray-700 line-through' : 'text-gray-900'
                }`}
              >
                {step.label}
              </span>
            </div>
            <div className="ml-4">{step.action}</div>
          </div>
        ))}
      </div>

      {syncInfo}

      {completedCount === totalSteps && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
          <p className="text-sm text-green-800 font-medium text-center">
            🎉 All set! You're ready to track and optimize your cloud costs.
          </p>
        </div>
      )}
    </div>
  )
}

