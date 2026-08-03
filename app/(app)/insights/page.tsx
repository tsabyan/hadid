import { Header } from '@/components/shell/header'
import { InsightsView } from '@/components/features/insights/insights-view'
import {
  getDailyVolume,
  getMuscleLoad,
  getProfile,
  listRecentPrs,
} from '@/lib/db/queries'
import { dailySeries, toIsoDate } from '@/lib/calc/volume'

/**
 * Period boundaries are computed here rather than in the client so the
 * queries and the chart cannot disagree about where a week starts. Off-by-one
 * week boundaries are the classic bug on this screen.
 */
function periodRange(
  range: 'week' | 'month',
  offset: number,
  weekStartsOn: number,
) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (range === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
    return { from, to }
  }

  const dayOfWeek = (now.getDay() - weekStartsOn + 7) % 7
  const from = new Date(now)
  from.setDate(now.getDate() - dayOfWeek + offset * 7)
  const to = new Date(from)
  to.setDate(from.getDate() + 6)
  return { from, to }
}

function shiftBack(from: Date, to: Date) {
  const span = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  const prevTo = new Date(from)
  prevTo.setDate(from.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevTo.getDate() - span + 1)
  return { from: prevFrom, to: prevTo }
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; offset?: string }>
}) {
  const params = await searchParams
  const range = params.range === 'month' ? 'month' : 'week'
  const offset = Math.min(0, Number(params.offset ?? 0) || 0)

  const profile = await getProfile()
  const weekStartsOn = profile?.week_starts_on ?? 1
  const unit = profile?.unit_system ?? 'metric'

  const { from, to } = periodRange(range, offset, weekStartsOn)
  const previous = shiftBack(from, to)

  const [volume, previousVolume, muscles, prs] = await Promise.all([
    getDailyVolume(from, to),
    getDailyVolume(previous.from, previous.to),
    getMuscleLoad(from, to),
    listRecentPrs(50),
  ])

  const series = dailySeries(
    volume
      .filter((row) => row.day)
      .map((row) => ({
        day: row.day as string,
        volume: Number(row.volume_kg ?? 0),
        sets: Number(row.set_count ?? 0),
      })),
    { from, to },
  )

  const points = series.map((entry) => ({
    ...entry,
    label: new Date(`${entry.day}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
    }),
  }))

  const muscleLoad: Record<string, number> = {}
  for (const row of muscles) {
    if (!row.muscle_group_id) continue
    muscleLoad[row.muscle_group_id] =
      (muscleLoad[row.muscle_group_id] ?? 0) + Number(row.load_kg ?? 0)
  }

  const sum = (
    rows: typeof volume,
    key: 'volume_kg' | 'set_count' | 'rep_count',
  ) => rows.reduce((total, row) => total + Number(row[key] ?? 0), 0)

  const totals = {
    volume: sum(volume, 'volume_kg'),
    sets: sum(volume, 'set_count'),
    reps: sum(volume, 'rep_count'),
    activeDays: volume.filter((row) => Number(row.set_count ?? 0) > 0).length,
  }

  const previousTotals = {
    volume: sum(previousVolume, 'volume_kg'),
    reps: sum(previousVolume, 'rep_count'),
    activeDays: previousVolume.filter((row) => Number(row.set_count ?? 0) > 0)
      .length,
  }

  const fromIso = toIsoDate(from)
  const toIso = toIsoDate(to)

  return (
    <>
      <Header title="Insights" />
      <InsightsView
        range={range}
        offset={offset}
        points={points}
        muscleLoad={muscleLoad}
        totals={totals}
        previousTotals={previousTotals}
        unit={unit}
        prs={prs
          .filter((pr) => {
            const day = pr.achieved_at.slice(0, 10)
            return day >= fromIso && day <= toIso
          })
          .map((pr) => ({
            id: pr.id,
            exerciseName:
              (pr.exercise as unknown as { name: string } | null)?.name ??
              'Exercise',
            recordType: pr.record_type,
            value: Number(pr.value),
            previousValue:
              pr.previous_value === null ? null : Number(pr.previous_value),
            achievedAt: pr.achieved_at,
          }))}
      />
    </>
  )
}
