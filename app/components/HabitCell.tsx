'use client'

import type { HabitEntry, HabitStatus } from '@/lib/types'
import { getDayHabitStatus } from '@/lib/habits-utils'

const STATUS_CLASSES: Record<HabitStatus, string> = {
  achieved: 'cell-achieved',
  missed: 'cell-missed',
  'no-data': 'cell-no-data',
}

const STATUS_DOT: Record<HabitStatus, string> = {
  achieved: 'status-achieved',
  missed: 'status-missed',
  'no-data': 'status-no-data',
}

interface HabitCellProps {
  entry: HabitEntry | null
  date: string
  compact?: boolean
}

function formatWakeup(time: string | null): string {
  if (!time) return '—'
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${dh}:${String(m).padStart(2, '0')}${period}`
}

export default function HabitCell({ entry, compact }: HabitCellProps) {
  const status = getDayHabitStatus(entry)

  if (compact) {
    return (
      <div className="flex gap-1 items-center justify-center">
        <span className={`status-dot ${STATUS_DOT[status.miles]}`} title="Miles" />
        <span className={`status-dot ${STATUS_DOT[status.wakeup]}`} title="Wakeup" />
        <span className={`status-dot ${STATUS_DOT[status.meals]}`} title="Meals" />
        <span className={`status-dot ${STATUS_DOT[status.flossed]}`} title="Flossed" />
      </div>
    )
  }

  return (
    <div className="space-y-1 min-w-0">
      {/* Miles */}
      <div className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ${STATUS_CLASSES[status.miles]}`}>
        <span>🏃</span>
        <span className="truncate font-mono">
          {entry?.equivalent_miles != null ? `${entry.equivalent_miles.toFixed(1)}mi` : '—'}
        </span>
      </div>

      {/* Wakeup */}
      <div className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ${STATUS_CLASSES[status.wakeup]}`}>
        <span>⏰</span>
        <span className="truncate font-mono">{formatWakeup(entry?.wakeup_time ?? null)}</span>
      </div>

      {/* Meals */}
      <div className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ${STATUS_CLASSES[status.meals]}`}>
        <span>🍔</span>
        <span className="truncate">
          {entry?.unhealthy_meals != null ? `${entry.unhealthy_meals} meal${entry.unhealthy_meals !== 1 ? 's' : ''}` : '—'}
        </span>
      </div>

      {/* Flossed */}
      <div className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ${STATUS_CLASSES[status.flossed]}`}>
        <span>🦷</span>
        <span>{entry?.flossed == null ? '—' : entry.flossed ? 'Yes' : 'No'}</span>
      </div>
    </div>
  )
}
