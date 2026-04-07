'use client'

import { useState } from 'react'
import type { HabitEntry } from '@/lib/types'

interface EditEntryModalProps {
  date: string
  entry: HabitEntry | null
  onClose: () => void
  onSaved: () => void
}

export default function EditEntryModal({ date, entry, onClose, onSaved }: EditEntryModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [wakeupTime, setWakeupTime] = useState(entry?.wakeup_time ?? '')
  const [unhealthyMeals, setUnhealthyMeals] = useState(
    entry?.unhealthy_meals != null ? String(entry.unhealthy_meals) : ''
  )
  const [flossed, setFlossed] = useState<string>(
    entry?.flossed == null ? '' : entry.flossed ? 'true' : 'false'
  )
  const [equivalentMiles, setEquivalentMiles] = useState(
    entry?.equivalent_miles != null ? String(entry.equivalent_miles) : ''
  )
  const [notes, setNotes] = useState(entry?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void doSave()
  }

  async function doSave() {
    setSaving(true)
    setError(null)

    const updates: Record<string, unknown> = { date }

    if (wakeupTime) updates.wakeup_time = wakeupTime
    else if (entry?.wakeup_time) updates.wakeup_time = null

    if (unhealthyMeals !== '') updates.unhealthy_meals = parseInt(unhealthyMeals, 10)
    if (flossed !== '') updates.flossed = flossed === 'true'
    if (equivalentMiles !== '') updates.equivalent_miles = parseFloat(equivalentMiles)
    if (notes) updates.notes = notes

    try {
      const res = await fetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error(await res.text())
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Edit Entry — {date}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Equivalent Miles */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              🏃 Equivalent Miles
              <span className="text-slate-500 text-xs ml-2">(runs 1:1, bikes ÷4)</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={equivalentMiles}
              onChange={e => setEquivalentMiles(e.target.value)}
              placeholder="e.g. 3.5"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Wakeup Time */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              ⏰ Wakeup Time <span className="text-slate-500 text-xs ml-2">(goal: before 6:30am PT)</span>
            </label>
            <input
              type="time"
              value={wakeupTime}
              onChange={e => setWakeupTime(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Unhealthy Meals */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              🍔 Unhealthy Meals Today <span className="text-slate-500 text-xs ml-2">(weekly goal: max 2)</span>
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setUnhealthyMeals(String(n))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    unhealthyMeals === String(n)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min="0"
                value={!['0','1','2','3',''].includes(unhealthyMeals) ? unhealthyMeals : ''}
                onChange={e => setUnhealthyMeals(e.target.value)}
                placeholder="4+"
                className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-slate-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Flossed */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">🦷 Flossed Tonight?</label>
            <div className="flex gap-3">
              {[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
                { value: '', label: 'Not set' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFlossed(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    flossed === opt.value
                      ? opt.value === 'true'
                        ? 'bg-green-600 border-green-500 text-white'
                        : opt.value === 'false'
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-600 border-slate-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors border border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
