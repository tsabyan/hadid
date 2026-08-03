import { CalendarCheck, Flame } from 'lucide-react'

import { StatCard } from '@/components/ui/stat-card'
import { formatVolume } from '@/lib/calc/units'
import { percentDelta } from '@/lib/calc/volume'
import type { UnitSystem } from '@/lib/calc/units'

/**
 * The three numbers pinned above the fold on every session.
 *
 * Rendered on the server so it arrives with the HTML — this row is the first
 * thing a user reads, and a skeleton that resolves half a second later is the
 * difference between "fast" and "fine".
 */
export function QuickStats({
  streak,
  weekVolumeKg,
  previousWeekVolumeKg,
  lastWorkout,
  unit,
}: {
  streak: number
  weekVolumeKg: number
  previousWeekVolumeKg: number
  lastWorkout: { name: string; started_at: string } | null
  unit: UnitSystem
}) {
  const delta = percentDelta(weekVolumeKg, previousWeekVolumeKg)

  return (
    <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5">
      <StatCard
        className="snap-start"
        label="Streak"
        value={streak}
        sub={streak === 1 ? 'day' : 'days'}
        icon={
          streak >= 3 ? <Flame size={14} className="text-accent" /> : undefined
        }
      />
      <StatCard
        className="snap-start"
        label="This week"
        value={formatVolume(weekVolumeKg, unit).split(' ')[0] ?? '0'}
        sub={unit === 'metric' ? 'kg moved' : 'lb moved'}
        {...(delta !== null ? { delta } : {})}
      />
      <StatCard
        className="snap-start"
        label="Last"
        value={lastWorkout ? relativeDay(lastWorkout.started_at) : '—'}
        sub={lastWorkout?.name ?? 'No workouts yet'}
        icon={<CalendarCheck size={14} className="text-text-tertiary" />}
      />
    </div>
  )
}

/** "Today" reads better than "0d ago" and is the answer people want. */
function relativeDay(iso: string): string {
  const then = new Date(iso)
  const now = new Date()
  then.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)

  const days = Math.round((now.getTime() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}
