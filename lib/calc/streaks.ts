/**
 * Training streaks.
 *
 * A streak is a run of consecutive calendar days with at least one finished
 * workout. Two decisions worth stating, because both are arbitrary and both
 * are visible to the user:
 *
 *  1. Today not being trained yet does not break the streak. Checking the app
 *     at 9am should not show a zero it will undo by evening — that reads as
 *     punishment for opening the app.
 *  2. Days are local calendar days. A set logged at 11pm and one at 1am are
 *     two days apart, which is what the calendar grid shows and therefore
 *     what the number has to agree with.
 */

import { toIsoDate } from './volume'

const DAY_MS = 86_400_000

/** Unique, sorted, ascending ISO dates. */
export function normalizeDays(dates: readonly (string | Date)[]): string[] {
  const set = new Set(
    dates.map((d) => (typeof d === 'string' ? d.slice(0, 10) : toIsoDate(d))),
  )
  return [...set].sort()
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS)
}

/**
 * Length of the run ending today or yesterday. A run that ended earlier is
 * history and scores zero — that is what makes it a *current* streak.
 */
export function currentStreak(
  dates: readonly (string | Date)[],
  today: Date = new Date(),
): number {
  const days = normalizeDays(dates)
  if (days.length === 0) return 0

  const todayIso = toIsoDate(today)
  const last = days[days.length - 1]!

  const gap = daysBetween(last, todayIso)
  if (gap > 1) return 0

  let streak = 1
  for (let i = days.length - 1; i > 0; i--) {
    if (daysBetween(days[i - 1]!, days[i]!) === 1) streak++
    else break
  }

  return streak
}

/** Longest run ever recorded — a lifetime stat, unaffected by today. */
export function longestStreak(dates: readonly (string | Date)[]): number {
  const days = normalizeDays(dates)
  if (days.length === 0) return 0

  let longest = 1
  let run = 1

  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1]!, days[i]!) === 1) run++
    else run = 1
    if (run > longest) longest = run
  }

  return longest
}

/** Distinct training days inside a range, inclusive of both ends. */
export function activeDays(
  dates: readonly (string | Date)[],
  range: { from: Date; to: Date },
): number {
  const from = toIsoDate(range.from)
  const to = toIsoDate(range.to)
  return normalizeDays(dates).filter((d) => d >= from && d <= to).length
}
