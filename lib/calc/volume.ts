/**
 * Volume aggregation.
 *
 * Volume is weight x reps, summed over working sets. Warm-ups are excluded
 * everywhere — counting empty-bar work would inflate every chart and hand out
 * volume badges for a warm-up routine.
 *
 * These functions mirror what `v_daily_volume` computes server-side. Both
 * exist because Insights must work with no connection, and a chart that
 * disagrees with the database depending on signal strength is worse than no
 * chart.
 */

export type SetLike = {
  weight_kg: number
  reps: number
  is_warmup: boolean
}

export const setVolume = (set: SetLike) =>
  set.is_warmup ? 0 : set.weight_kg * set.reps

export const totalVolume = (sets: readonly SetLike[]) =>
  sets.reduce((sum, set) => sum + setVolume(set), 0)

export const workingSets = (sets: readonly SetLike[]) =>
  sets.filter((set) => !set.is_warmup)

export const totalReps = (sets: readonly SetLike[]) =>
  workingSets(sets).reduce((sum, set) => sum + set.reps, 0)

export type DayVolume = { day: string; volume: number; sets: number }

/**
 * Buckets sets by ISO date. Returns a dense series across the requested range
 * — days with no training are present with zero, because a bar chart with
 * missing columns silently rescales the x-axis and misrepresents a rest day
 * as a day that never happened.
 */
export function dailySeries(
  entries: readonly { day: string; volume: number; sets: number }[],
  range: { from: Date; to: Date },
): DayVolume[] {
  const byDay = new Map(entries.map((e) => [e.day, e]))
  const out: DayVolume[] = []

  const cursor = new Date(range.from)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(range.to)
  end.setHours(0, 0, 0, 0)

  while (cursor <= end) {
    const key = toIsoDate(cursor)
    const hit = byDay.get(key)
    out.push({ day: key, volume: hit?.volume ?? 0, sets: hit?.sets ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  return out
}

/**
 * Percentage change against the previous period.
 *
 * Growth from zero is reported as null, not as Infinity or 100%. There is no
 * honest percentage for "you did nothing last week and something this week",
 * and the UI shows the raw number instead.
 */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

/** Local ISO date. `toISOString()` would shift the day for anyone east or west of UTC. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
