'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { motion } from 'motion/react'

import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { StatCard } from '@/components/ui/stat-card'
import { VolumeChart, type VolumePoint } from '@/components/charts/volume-chart'
import { MuscleMapPair } from '@/components/anatomy/muscle-map'
import { MUSCLE_GROUP_BY_ID } from '@/data/muscle-groups'
import { normalizeLoad, topMuscles } from '@/lib/calc/muscle-load'
import { formatVolume, type UnitSystem } from '@/lib/calc/units'
import { percentDelta } from '@/lib/calc/volume'
import { spring } from '@/lib/motion'

export type PrRow = {
  id: string
  exerciseName: string
  recordType: string
  value: number
  previousValue: number | null
  achievedAt: string
}

export function InsightsView({
  range,
  offset,
  points,
  muscleLoad,
  totals,
  previousTotals,
  prs,
  unit,
}: {
  range: 'week' | 'month'
  offset: number
  points: VolumePoint[]
  muscleLoad: Record<string, number>
  totals: { volume: number; sets: number; reps: number; activeDays: number }
  previousTotals: { volume: number; reps: number; activeDays: number }
  prs: PrRow[]
  unit: UnitSystem
}) {
  const router = useRouter()
  const [prsOpen, setPrsOpen] = useState(false)

  const normalized = normalizeLoad(muscleLoad)
  const improvements = prs.filter((pr) => pr.previousValue !== null)

  const repsDelta = percentDelta(totals.reps, previousTotals.reps)
  const daysDelta = percentDelta(totals.activeDays, previousTotals.activeDays)

  const go = (nextRange: 'week' | 'month', nextOffset: number) =>
    router.push(`/insights?range=${nextRange}&offset=${nextOffset}`)

  const periodLabel =
    points.length > 0
      ? `${formatDay(points[0]!.day)} – ${formatDay(points[points.length - 1]!.day)}`
      : ''

  return (
    <div className="flex flex-col gap-5 px-5 py-4">
      <Segmented
        value={range}
        onChange={(next) => go(next, 0)}
        options={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
        ]}
      />

      <div className="flex items-center justify-between">
        <button
          onClick={() => go(range, offset - 1)}
          aria-label="Previous period"
          className="text-text-secondary flex size-11 items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-subhead font-medium">{periodLabel}</span>
        <button
          onClick={() => go(range, offset + 1)}
          disabled={offset >= 0}
          aria-label="Next period"
          className="text-text-secondary flex size-11 items-center justify-center disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Reps"
          value={totals.reps.toLocaleString('en-US')}
          sub={`${totals.sets} sets`}
          {...(repsDelta !== null ? { delta: repsDelta } : {})}
        />
        <StatCard
          label="Active days"
          value={totals.activeDays}
          sub={formatVolume(totals.volume, unit)}
          {...(daysDelta !== null ? { delta: daysDelta } : {})}
        />
      </div>

      {improvements.length > 0 && (
        <button onClick={() => setPrsOpen((open) => !open)} className="text-left">
          <div className="bg-accent-soft flex items-center gap-3 rounded-lg px-4 py-3">
            <Trophy size={18} className="text-accent shrink-0" />
            <span className="text-headline text-accent flex-1">
              {improvements.length} personal{' '}
              {improvements.length === 1 ? 'record' : 'records'}
            </span>
            <ChevronRight
              size={16}
              className="text-accent"
              style={{ transform: prsOpen ? 'rotate(90deg)' : undefined }}
            />
          </div>
        </button>
      )}

      {prsOpen && improvements.length > 0 && (
        <motion.ul
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.snappy}
          className="flex flex-col gap-2"
        >
          {improvements.map((pr) => (
            <li
              key={pr.id}
              className="bg-surface flex items-center justify-between rounded-md px-3 py-2.5 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-headline truncate">{pr.exerciseName}</p>
                <p className="text-footnote text-text-secondary">
                  {RECORD_LABELS[pr.recordType] ?? pr.recordType}
                </p>
              </div>
              <div className="text-right">
                <p className="tabular text-headline font-mono">
                  {formatRecord(pr, unit)}
                </p>
                {pr.previousValue !== null && (
                  <p className="text-caption text-success">
                    +{round(pr.value - pr.previousValue)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </motion.ul>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-overline text-text-tertiary uppercase">
          Daily volume
        </h2>
        <Card>
          <VolumeChart points={points} unit={unit} />
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-overline text-text-tertiary uppercase">
          Muscles trained
        </h2>
        <Card className="flex flex-col gap-4">
          <div className="h-[170px]">
            <MuscleMapPair load={normalized} className="h-full" />
          </div>

          {/* Colour is never the only channel — the same information as text. */}
          <div className="flex flex-wrap gap-1.5">
            {topMuscles(normalized, 8).map((muscle) => (
              <span
                key={muscle.id}
                className="bg-sunken text-caption text-text-secondary rounded-full px-2.5 py-1"
              >
                {MUSCLE_GROUP_BY_ID[muscle.id]?.name ?? muscle.id}{' '}
                <span className="text-text-tertiary tabular">
                  {Math.round(muscle.load * 100)}%
                </span>
              </span>
            ))}
            {topMuscles(normalized).length === 0 && (
              <span className="text-subhead text-text-secondary">
                Nothing logged this period.
              </span>
            )}
          </div>
        </Card>
      </section>
    </div>
  )
}

const RECORD_LABELS: Record<string, string> = {
  max_weight: 'Heaviest weight',
  max_reps: 'Most reps',
  max_volume: 'Best set volume',
  est_1rm: 'Estimated 1RM',
}

function formatRecord(pr: PrRow, unit: UnitSystem): string {
  if (pr.recordType === 'max_reps') return `${round(pr.value)} reps`
  return formatVolume(pr.value, unit)
}

const round = (n: number) => Math.round(n * 10) / 10

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
