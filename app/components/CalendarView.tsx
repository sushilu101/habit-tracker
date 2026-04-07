'use client'

import { useState } from 'react'
import { format, parseISO, isSameDay } from 'date-fns'
import type { WeekData } from '@/lib/types'
import HabitCell from './HabitCell'
import EditEntryModal from './EditEntryModal'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface CalendarViewProps {
  weeks: WeekData[]
  onEntryUpdated: () => void
}

function GoalPill({
  icon, label, goalMet, neutral,
}: { icon: string; label: string; goalMet: boolean; neutral?: boolean }) {
  const cls = neutral
    ? 'bg-slate-700/50 text-slate-300 border-slate-600/50'
    : goalMet
    ? 'bg-green-500/10 text-green-400 border-green-500/30'
    : 'bg-red-500/10 text-red-400 border-red-500/30'
  return (
    <div className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs border ${cls}`}>
      <span>{icon}</span>
      <span className="font-mono font-semibold whitespace-nowrap">{label}</span>
    </div>
  )
}

function WeeklyTotalsCell({ totals }: { totals: WeekData['weeklyTotals'] }) {
  return (
    <div className="space-y-1 min-w-0">
      <GoalPill
        icon="🏃"
        label={`${totals.totalEquivalentMiles.toFixed(1)}/30 mi`}
        goalMet={totals.milesGoalMet}
      />
      <GoalPill
        icon="⏰"
        label={`${totals.earlyWakeupDays}/5 early`}
        goalMet={totals.wakeupGoalMet}
        neutral={totals.earlyWakeupDays === 0 && totals.daysWithData === 0}
      />
      <GoalPill
        icon="🍔"
        label={`${totals.totalUnhealthyMeals}/2 max`}
        goalMet={totals.mealsGoalMet}
      />
      <GoalPill
        icon="🦷"
        label={`${totals.flossedDays}/5 nights`}
        goalMet={totals.flossGoalMet}
        neutral={totals.flossedDays === 0 && totals.daysWithData === 0}
      />
    </div>
  )
}

export default function CalendarView({ weeks, onEntryUpdated }: CalendarViewProps) {
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<WeekData['days'][0]>(null)

  const today = new Date()

  function handleCellClick(date: string, entry: WeekData['days'][0]) {
    setEditingDate(date)
    setEditingEntry(entry)
  }

  return (
    <div className="overflow-x-auto pb-2">
      {/* Header legend */}
      <div className="flex items-center gap-4 mb-4 px-1 text-xs text-slate-400 flex-wrap">
        <span className="font-semibold text-slate-300">Calendar</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> Goal met
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> Goal missed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-600" /> No data
        </span>
        <span className="ml-auto text-slate-500">Click a day to edit</span>
      </div>

      <div className="space-y-6">
        {[...weeks].reverse().map((week) => {
          const weekLabel = format(week.weekStart, 'MMM d') + ' – ' + format(week.weekEnd, 'MMM d, yyyy')

          return (
            <div key={format(week.weekStart, 'yyyy-MM-dd')} className="rounded-xl border border-slate-700/60 overflow-hidden">
              {/* Week header */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/60">
                <span className="text-sm font-semibold text-slate-200">{weekLabel}</span>
                <span className="text-xs text-slate-400">
                  {week.weeklyTotals.daysWithData} day{week.weeklyTotals.daysWithData !== 1 ? 's' : ''} tracked
                </span>
              </div>

              {/* Days grid */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/40">
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-16">Day</th>
                      {DAY_LABELS.map(d => (
                        <th key={d} className="px-2 py-2 text-xs text-slate-500 font-medium text-center min-w-[90px]">
                          {d}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-xs text-slate-400 font-semibold text-center min-w-[90px] bg-slate-800/40">
                        Weekly Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-3 text-xs text-slate-500 align-top font-medium">Habits</td>
                      {week.days.map((entry, dayIdx) => {
                        const dayDate = new Date(week.weekStart)
                        dayDate.setDate(dayDate.getDate() + dayIdx)
                        const dateStr = format(dayDate, 'yyyy-MM-dd')
                        const isToday = isSameDay(dayDate, today)
                        const isFuture = dayDate > today

                        return (
                          <td
                            key={dayIdx}
                            className={`px-2 py-3 align-top cursor-pointer transition-colors ${
                              isFuture
                                ? 'opacity-30 cursor-default'
                                : isToday
                                ? 'bg-blue-500/5 hover:bg-blue-500/10'
                                : 'hover:bg-slate-700/30'
                            }`}
                            onClick={() => !isFuture && handleCellClick(dateStr, entry)}
                          >
                            <div className="mb-1 text-center">
                              <span className={`text-xs font-mono ${isToday ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                                {format(dayDate, 'M/d')}
                                {isToday && <span className="ml-1 text-blue-400">•</span>}
                              </span>
                            </div>
                            <HabitCell entry={entry} date={dateStr} />
                          </td>
                        )
                      })}
                      {/* Weekly totals column */}
                      <td className="px-2 py-3 align-top bg-slate-800/40 border-l border-slate-700/40">
                        <WeeklyTotalsCell totals={week.weeklyTotals} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {editingDate && (
        <EditEntryModal
          date={editingDate}
          entry={editingEntry}
          onClose={() => {
            setEditingDate(null)
            setEditingEntry(null)
          }}
          onSaved={() => {
            setEditingDate(null)
            setEditingEntry(null)
            onEntryUpdated()
          }}
        />
      )}
    </div>
  )
}
