'use client'

import { useState } from 'react'

interface StravaConnectProps {
  isConnected: boolean
  onSyncComplete?: () => void
}

export default function StravaConnect({ isConnected, onSyncComplete }: StravaConnectProps) {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLastSync(`Synced ${data.synced} day(s)`)
      onSyncComplete?.()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (!isConnected) {
    return (
      <a
        href="/api/auth/strava"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        Connect Strava
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {lastSync && <span className="text-xs text-green-400">{lastSync}</span>}
      {syncError && <span className="text-xs text-red-400">{syncError}</span>}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/30 transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        {syncing ? 'Syncing...' : 'Sync Strava'}
      </button>
    </div>
  )
}
