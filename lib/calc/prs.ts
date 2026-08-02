/**
 * Personal records — client mirror of `detect_prs()`.
 *
 * The database is authoritative: it is the only writer, so a badge cannot be
 * fabricated. These functions exist to show the PR banner immediately after a
 * set is logged, before the round trip completes, and to keep Insights working
 * offline. If the two ever disagree, the server wins.
 */

import type { SetLike } from './volume'

export type RecordType = 'max_weight' | 'max_reps' | 'max_volume' | 'est_1rm'

export type ScoredSet = SetLike & { id?: string }

/**
 * Epley. Shown as a secondary line and labelled an estimate, never presented
 * as a lift the user actually performed — the difference matters to anyone
 * training near a real one-rep max.
 */
export function estimate1rm(weightKg: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weightKg
  return round2(weightKg * (1 + reps / 30))
}

export function scoreSet(set: ScoredSet, type: RecordType): number {
  if (set.is_warmup || set.reps <= 0) return 0
  switch (type) {
    case 'max_weight':
      return set.weight_kg
    case 'max_reps':
      return set.reps
    case 'max_volume':
      return set.weight_kg * set.reps
    case 'est_1rm':
      return estimate1rm(set.weight_kg, set.reps)
  }
}

/** Best set in a collection for a given record type, or null if none qualify. */
export function bestSet<T extends ScoredSet>(
  sets: readonly T[],
  type: RecordType,
): T | null {
  let best: T | null = null
  let bestScore = 0

  for (const set of sets) {
    const score = scoreSet(set, type)
    if (score > bestScore) {
      best = set
      bestScore = score
    }
  }

  return best
}

export type PrCandidate = {
  recordType: RecordType
  value: number
  previous: number | null
  reps: number
  setId?: string
}

/**
 * Compares a session's sets against existing bests.
 *
 * A record with no previous value is a baseline rather than an improvement.
 * Both are returned, distinguished by `previous`, because the UI wants to say
 * "first record" differently from "+5 kg" — and because badge counting must
 * ignore baselines or a first workout would unlock half the strength tier.
 */
export function findPrs(
  sessionSets: readonly ScoredSet[],
  existingBests: Partial<Record<RecordType, number>>,
): PrCandidate[] {
  const types: RecordType[] = [
    'max_weight',
    'max_reps',
    'max_volume',
    'est_1rm',
  ]
  const out: PrCandidate[] = []

  for (const type of types) {
    const best = bestSet(sessionSets, type)
    if (!best) continue

    const value = round2(scoreSet(best, type))
    const previous = existingBests[type] ?? null

    if (previous === null || value > previous) {
      out.push({
        recordType: type,
        value,
        previous,
        reps: best.reps,
        ...(best.id ? { setId: best.id } : {}),
      })
    }
  }

  return out
}

/** Improvements only — what the strength badges actually count. */
export const countImprovements = (prs: readonly PrCandidate[]) =>
  prs.filter((pr) => pr.previous !== null).length

const round2 = (n: number) => Math.round(n * 100) / 100
