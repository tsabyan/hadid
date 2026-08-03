'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'

import { Card } from '@/components/ui/card'
import { MuscleMapPair } from '@/components/anatomy/muscle-map'
import { MUSCLE_GROUP_BY_ID } from '@/data/muscle-groups'
import { heatBucket, normalizeLoad, topMuscles } from '@/lib/calc/muscle-load'
import { formatDuration, formatVolume, type UnitSystem } from '@/lib/calc/units'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'

export type DaySummary = {
  day: string
  volume: number
  sets: number
  workouts: number
}

export type WorkoutRow = {
  workout_id: string
  name: string
  started_at: string
  duration_seconds: number | null
  total_volume_kg: number
  total_sets: number
}

export type MuscleRow = { day: string; muscle_group_id: string; load: number }

export function HistoryCalendar({
  month,
  days,
  workouts,
  muscles,
  weekStartsOn,
  unit,
}: {
  /** First day of the displayed month, ISO. */
  month: string
  days: DaySummary[]
  workouts: WorkoutRow[]
  muscles: MuscleRow[]
  weekStartsOn: number
  unit: UnitSystem
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const monthDate = new Date(`${month}T00:00:00`)
  const byDay = useMemo(
    () => new Map(days.map((d) => [d.day, d])),
    [days],
  )

  // Buckets are relative to the heaviest day in view, not an absolute scale.
  // An absolute scale renders a whole deload month as blank, which is the
  // opposite of what someone checking their consistency wants to see.
  const peak = Math.max(...days.map((d) => d.volume), 0)

  const cells = useMemo(
    () => buildGrid(monthDate, weekStartsOn),
    [month, weekStartsOn], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const selectedDay = selected ? byDay.get(selected) : null
  const selectedWorkouts = selected
    ? workouts.filter((w) => w.started_at.slice(0, 10) === selected)
    : []

  const selectedLoad = useMemo(() => {
    if (!selected) return {}
    const raw: Record<string, number> = {}
    for (const row of muscles) {
      if (row.day !== selected) continue
      raw[row.muscle_group_id] = (raw[row.muscle_group_id] ?? 0) + row.load
    }
    return normalizeLoad(raw)
  }, [selected, muscles])

  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const todayIso = toIso(new Date())

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/history?month=${shiftMonth(month, -1)}`)}
          aria-label="Previous month"
          className="text-text-secondary flex size-11 items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-title-3">{monthLabel}</h2>
        <button
          onClick={() => router.push(`/history?month=${shiftMonth(month, 1)}`)}
          aria-label="Next month"
          className="text-text-secondary flex size-11 items-center justify-center"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels(weekStartsOn).map((label) => (
          <span
            key={label}
            className="text-caption text-text-tertiary py-1 text-center"
          >
            {label}
          </span>
        ))}

        {cells.map((cell, i) => {
          if (!cell) return <span key={`pad-${i}`} />

          const entry = byDay.get(cell)
          const intensity = peak > 0 ? (entry?.volume ?? 0) / peak : 0
          const bucket = heatBucket(intensity)
          const isToday = cell === todayIso
          const isSelected = cell === selected

          return (
            <button
              key={cell}
              onClick={() => setSelected(isSelected ? null : cell)}
              aria-label={`${cell}${entry ? `, ${entry.sets} sets` : ', rest day'}`}
              aria-pressed={isSelected}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-md',
                'tabular font-mono text-[13px] transition-colors',
                isToday && 'ring-accent ring-2',
                isSelected && 'ring-text ring-2',
                // Text flips to white once the fill is dark enough that dark
                // text would drop below contrast.
                bucket >= 3 ? 'text-white' : 'text-text-secondary',
              )}
              style={{ background: `var(--heat-${bucket})` }}
            >
              {new Date(`${cell}T00:00:00`).getDate()}
              {/* Rest days keep a faint dot. A grid of blanks reads as
                  scattered noise; a grid with dots reads as a rhythm. */}
              {!entry && (
                <span className="bg-text-tertiary/25 absolute bottom-1 size-1 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.smooth}
        >
          <Card className="flex flex-col gap-4">
            <div>
              <h3 className="text-title-3">
                {new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <p className="text-footnote text-text-secondary">
                {selectedDay
                  ? `${selectedDay.workouts} ${selectedDay.workouts === 1 ? 'workout' : 'workouts'} · ${formatVolume(selectedDay.volume, unit)} · ${selectedDay.sets} sets`
                  : 'Rest day'}
              </p>
            </div>

            {selectedWorkouts.length > 0 && (
              <>
                <div className="h-[150px]">
                  <MuscleMapPair load={selectedLoad} className="h-full" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {topMuscles(selectedLoad, 8).map((muscle) => (
                    <span
                      key={muscle.id}
                      className="bg-sunken text-caption text-text-secondary rounded-full px-2.5 py-1"
                    >
                      {MUSCLE_GROUP_BY_ID[muscle.id]?.name ?? muscle.id}
                    </span>
                  ))}
                </div>

                <ul className="flex flex-col gap-2">
                  {selectedWorkouts.map((workout) => (
                    <li key={workout.workout_id}>
                      <Link
                        href={`/workout/${workout.workout_id}`}
                        className="border-separator flex items-center justify-between border-t pt-2"
                      >
                        <span className="text-headline">{workout.name}</span>
                        <span className="text-footnote text-text-secondary tabular font-mono">
                          {formatDuration(workout.duration_seconds ?? 0)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  )
}

/** Nulls pad the leading offset so the first of the month lands on its weekday. */
function buildGrid(month: Date, weekStartsOn: number): (string | null)[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()

  const first = new Date(year, monthIndex, 1)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  const offset = (first.getDay() - weekStartsOn + 7) % 7

  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toIso(new Date(year, monthIndex, i + 1)),
    ),
  ]
}

function weekdayLabels(weekStartsOn: number): string[] {
  const base = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return [...base.slice(weekStartsOn), ...base.slice(0, weekStartsOn)]
}

function shiftMonth(month: string, delta: number): string {
  const date = new Date(`${month}T00:00:00`)
  date.setMonth(date.getMonth() + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
