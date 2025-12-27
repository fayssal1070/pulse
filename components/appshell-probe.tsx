'use client'

interface AppShellProbeProps {
  mounted: boolean
  source: string
}

export default function AppShellProbe({ mounted, source }: AppShellProbeProps) {
  return (
    <div 
      className="fixed bottom-0 left-0 z-50 bg-yellow-600 text-white text-xs font-mono px-3 py-1 rounded-tr-lg border-t border-r border-yellow-700 shadow-lg"
      style={{ 
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.4',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold">AppShell:</span>
        <span className={mounted ? 'text-green-300 font-bold' : 'text-red-300 font-bold'}>
          {mounted ? 'MOUNTED' : 'NOT USED'}
        </span>
        <span className="text-yellow-200">({source})</span>
      </div>
    </div>
  )
}



