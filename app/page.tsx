'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import CalendarView from './components/CalendarView'
import StatsPanel from './components/StatsPanel'
import StravaConnect from './components/StravaConnect'
import type { WeekData } from '@/lib/types'

function WeeksSlider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Weeks:</span>
      {[4, 8, 12].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            value === n
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeksToShow, setWeeksToShow] = useState(8)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/habits?weeks=${weeksToShow}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Convert date strings back to Date objects for weekStart/weekEnd
      const processedWeeks = data.weeks.map((w: WeekData & { weekStart: string; weekEnd: string }) => ({
        ...w,
        weekStart: new Date(w.weekStart),
        weekEnd: new Date(w.weekEnd),
      }))
      setWeeks(processedWeeks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [weeksToShow])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Check Strava connection status
  useEffect(() => {
    fetch('/api/strava/status')
      .then(r => r.json())
      .then(d => setStravaConnected(d.connected))
      .catch(() => {})
  }, [])

  // Handle URL params from OAuth callbacks
  useEffect(() => {
    const stravaConnectedParam = searchParams.get('strava_connected')
    const stravaErrorParam = searchParams.get('strava_error')

    if (stravaConnectedParam === 'true') {
      setStravaConnected(true)
      setNotification({ type: 'success', msg: 'Strava connected! Syncing activities...' })
      // Auto-sync after connect
      fetch('/api/strava/sync', { method: 'POST' })
        .then(() => fetchData())
        .catch(() => {})
    } else if (stravaErrorParam) {
      setNotification({ type: 'error', msg: `Strava connection failed: ${stravaErrorParam}` })
    }
  }, [searchParams, fetchData])

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(null), 5000)
    return () => clearTimeout(t)
  }, [notification])

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 md:px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Habit Tracker</h1>
            <p className="text-xs text-slate-500 mt-0.5">Personal daily habit dashboard</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <WeeksSlider value={weeksToShow} onChange={setWeeksToShow} />
            <StravaConnect
              isConnected={stravaConnected}
              onSyncComplete={fetchData}
            />
          </div>
        </div>
      </header>

      {/* Notification banner */}
      {notification && (
        <div className={`px-4 md:px-6 py-3 text-sm font-medium ${
          notification.type === 'success' ? 'bg-green-900/50 text-green-300 border-b border-green-800' : 'bg-red-900/50 text-red-300 border-b border-red-800'
        }`}>
          <div className="max-w-screen-xl mx-auto">{notification.msg}</div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-800/50 text-red-300 text-sm">
            Error loading data: {error}
            <button onClick={fetchData} className="ml-3 underline hover:no-underline">Retry</button>
          </div>
        )}

        {loading && !weeks.length ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading habit data...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Calendar - takes most of the space */}
            <div className="flex-1 min-w-0">
              <CalendarView weeks={weeks} onEntryUpdated={fetchData} />
            </div>

            {/* Stats panel */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0">
              <div className="sticky top-6">
                <h2 className="text-sm font-semibold text-slate-300 mb-4 px-1">Stats & Trends</h2>
                <StatsPanel weeks={weeks} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-8 px-4 md:px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
          <span>Daily SMS check-in at 10pm PT · Weekly summary on Sundays at 9pm PT</span>
          <span>🏃 runs 1:1 · 🚴 bikes ÷4 · ⏰ goal before 6:30am · 🍔 max 2/week · 🦷 nightly</span>
        </div>
      </footer>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
