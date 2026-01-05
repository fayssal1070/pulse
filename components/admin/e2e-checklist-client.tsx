'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface E2EChecklistClientProps {
  initialChecks: {
    db: boolean
    directory: boolean
    budgets: boolean
    rules: boolean
    cronAlerts: boolean
    cronRetention: boolean
    cronCur: boolean
    notifications: boolean
  }
  lastCronRuns: {
    alerts: any
    retention: any
    cur: any
  }
  organizationId: string
}

interface OpenAISmokeTestResult {
  success: boolean
  tests: Array<{
    name: string
    passed: boolean
    error?: string
    durationMs?: number
    details?: any
  }>
  totalDurationMs: number
  cleanupError?: string
}

export default function E2EChecklistClient({
  initialChecks,
  lastCronRuns,
  organizationId,
}: E2EChecklistClientProps) {
  const router = useRouter()
  const [checks, setChecks] = useState(initialChecks)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSeed = async () => {
    setLoading('seed')
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        showToast('success', 'Seed completed successfully')
        router.refresh()
      } else {
        showToast('error', data.error || 'Seed failed')
      }
    } catch (error) {
      showToast('error', 'Failed to seed')
    } finally {
      setLoading(null)
    }
  }

  const handleGenerateTestData = async () => {
    setLoading('test-data')
    try {
      const res = await fetch('/api/admin/test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'BOTH', amountEUR: 100 }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', `Generated ${data.eventsCreated} test events`)
        router.refresh()
      } else {
        showToast('error', data.error || 'Failed to generate test data')
      }
    } catch (error) {
      showToast('error', 'Failed to generate test data')
    } finally {
      setLoading(null)
    }
  }

  const handleRunCron = async () => {
    setLoading('cron')
    try {
      const { runCronAlerts } = await import('@/app/actions/run-cron')
      const result = await runCronAlerts()
      showToast('success', `Cron executed: ${result.processedOrgs || 0} orgs processed`)
      router.refresh()
    } catch (error: any) {
      showToast('error', error.message || 'Failed to run cron')
    } finally {
      setLoading(null)
    }
  }

  const handleCopyJSON = () => {
    const json = JSON.stringify(
      {
        checks,
        lastCronRuns,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
    navigator.clipboard.writeText(json)
    showToast('success', 'JSON copied to clipboard')
  }

  const CheckCard = ({ id, label, ok }: { id: string; label: string; ok: boolean }) => (
    <div
      data-testid={`e2e-${id}`}
      className={`p-4 rounded-lg border-2 ${
        ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className={ok ? 'text-green-600' : 'text-red-600'}>{ok ? 'OK ✓' : 'KO ✗'}</span>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">E2E Validation Checklist</h1>
        <p className="text-sm text-gray-600 mt-1">Admin-only validation page for PR14</p>
      </div>

      {toast && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <CheckCard id="db" label="DB reachable + migrations ok" ok={checks.db} />
        <CheckCard id="directory" label="Directory non vide" ok={checks.directory} />
        <CheckCard id="budgets" label="Au moins 1 budget actif" ok={checks.budgets} />
        <CheckCard id="rules" label="Au moins 1 alert rule enabled" ok={checks.rules} />
        <CheckCard
          id="cron-alerts"
          label={`Cron run-alerts accessible${lastCronRuns.alerts ? ` (last: ${new Date(lastCronRuns.alerts.startedAt).toLocaleString()})` : ''}`}
          ok={checks.cronAlerts}
        />
        <CheckCard
          id="cron-retention"
          label={`Cron apply-retention accessible${lastCronRuns.retention ? ` (last: ${new Date(lastCronRuns.retention.startedAt).toLocaleString()})` : ''}`}
          ok={checks.cronRetention}
        />
        <CheckCard
          id="cron-cur"
          label={`Cron sync-aws-cur accessible${lastCronRuns.cur ? ` (last: ${new Date(lastCronRuns.cur.startedAt).toLocaleString()})` : ''}`}
          ok={checks.cronCur}
        />
        <CheckCard id="notifications" label="Notifications preferences existantes" ok={checks.notifications} />
      </div>

      <div className="flex gap-4 mb-6">
        <button
          data-testid="btn-seed"
          onClick={handleSeed}
          disabled={loading !== null}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'seed' ? 'Seeding...' : 'Seed now'}
        </button>
        <button
          data-testid="btn-generate-test"
          onClick={handleGenerateTestData}
          disabled={loading !== null}
          className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'test-data' ? 'Generating...' : 'Generate test data'}
        </button>
        <button
          data-testid="btn-run-cron"
          onClick={handleRunCron}
          disabled={loading !== null}
          className="px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'cron' ? 'Running...' : 'Run cron now'}
        </button>
        <button
          onClick={handleCopyJSON}
          className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700"
        >
          Copy JSON
        </button>
      </div>
    </div>
  )
}

