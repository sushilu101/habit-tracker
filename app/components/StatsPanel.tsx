'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import type { WeekData } from '@/lib/types'
import { GOALS } from '@/lib/goals'

interface StatsPanelProps {
  weeks: WeekData[]
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
  padding: '6px 10px',
}

const AXIS_TICK = { fontSize: 10, fill: '#64748b' }
const GRID_STROKE = '#1e293b'

interface ChartConfig {
  icon: string
  title: string
  dataKey: string
  color: string
  goalY: number
  goalLabel: string
  yDomain?: [number, number | 'auto']
  formatter: (v: number) => string
}

const CHARTS: ChartConfig[] = [
  {
    icon: '🏃',
    title: 'Weekly Miles',
    dataKey: 'miles',
    color: '#3b82f6',
    goalY: GOALS.milesPerWeek,
    goalLabel: `${GOALS.milesPerWeek} mi goal`,
    yDomain: [0, 'auto'],
    formatter: (v) => `${v.toFixed(1)} mi`,
  },
  {
    icon: '⏰',
    title: 'Early Wakeups',
    dataKey: 'earlyWakeups',
    color: '#a78bfa',
    goalY: GOALS.earlyWakeupDaysPerWeek,
    goalLabel: `${GOALS.earlyWakeupDaysPerWeek} days goal`,
    yDomain: [0, 7],
    formatter: (v) => `${v} day${v !== 1 ? 's' : ''}`,
  },
  {
    icon: '🍔',
    title: 'Unhealthy Meals',
    dataKey: 'meals',
    color: '#f97316',
    goalY: GOALS.maxUnhealthyMealsPerWeek,
    goalLabel: `${GOALS.maxUnhealthyMealsPerWeek} max`,
    yDomain: [0, 'auto'],
    formatter: (v) => `${v} meal${v !== 1 ? 's' : ''}`,
  },
  {
    icon: '🦷',
    title: 'Nights Flossed',
    dataKey: 'flossed',
    color: '#22c55e',
    goalY: GOALS.flossNightsPerWeek,
    goalLabel: `${GOALS.flossNightsPerWeek} nights goal`,
    yDomain: [0, 7],
    formatter: (v) => `${v} night${v !== 1 ? 's' : ''}`,
  },
]

export default function StatsPanel({ weeks }: StatsPanelProps) {
  if (!weeks.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No data yet
      </div>
    )
  }

  // Build chart data — oldest left, most recent right, all 8 weeks
  const chartData = weeks.map(w => ({
    week: format(w.weekStart, 'MMM d'),
    miles: w.weeklyTotals.totalEquivalentMiles,
    earlyWakeups: w.weeklyTotals.earlyWakeupDays,
    meals: w.weeklyTotals.totalUnhealthyMeals,
    flossed: w.weeklyTotals.flossedDays,
    hasData: w.weeklyTotals.daysWithData > 0,
  }))

  return (
    <div className="space-y-6">
      {CHARTS.map((chart) => (
        <div key={chart.dataKey} className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span>{chart.icon}</span>
            {chart.title}
            <span className="ml-auto text-xs font-normal text-slate-500">
              goal: {chart.goalLabel}
            </span>
          </h3>

          <ResponsiveContainer width="100%" height={120}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_STROKE}
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={32}
              />
              <YAxis
                domain={chart.yDomain}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                allowDecimals={chart.dataKey === 'miles'}
                width={28}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => [chart.formatter(v as number), chart.title]}
                labelStyle={{ color: '#94a3b8', marginBottom: 2 }}
              />
              <ReferenceLine
                y={chart.goalY}
                stroke={chart.color}
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey={chart.dataKey}
                stroke={chart.color}
                strokeWidth={2}
                dot={{ r: 3, fill: chart.color, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: chart.color, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
