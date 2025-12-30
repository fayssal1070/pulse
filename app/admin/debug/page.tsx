import { AppShell } from '@/components/app-shell'
import { DebugDbConnectionClient } from '@/components/admin/debug-db-connection-client'

export default async function AdminDebugPage() {
  return (
    <AppShell>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Database Connection Debug</h1>
        <DebugDbConnectionClient />
      </div>
    </AppShell>
  )
}

