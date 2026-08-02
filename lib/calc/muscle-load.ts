/**
 * Muscle load — what tints the anatomy heat maps.
 *
 * Load is volume weighted by how much a muscle actually contributes to the
 * movement. Without the activation factor, every assisting muscle scores the
 * same as the target and the diagram becomes a uniform smear that says
 * nothing.
 *
 * Mirrors `v_muscle_load`.
 */

import { EXERCISE_BY_SLUG } from '@/data/exercises.seed'
import type { MuscleGroupId } from '@/data/muscle-groups'

export type LoadedSet = {
  exerciseSlug: string
  weight_kg: number
  reps: number
  is_warmup: boolean
}

export type MuscleLoad = Partial<Record<MuscleGroupId, number>>

export function accumulateLoad(sets: readonly LoadedSet[]): MuscleLoad {
  const load: Record<string, number> = {}

  for (const set of sets) {
    if (set.is_warmup || set.reps <= 0) continue

    const exercise = EXERCISE_BY_SLUG.get(set.exerciseSlug)
    if (!exercise) continue

    const volume = set.weight_kg * set.reps
    for (const [muscle, activation] of Object.entries(exercise.muscles)) {
      load[muscle] = (load[muscle] ?? 0) + volume * activation
    }
  }

  return load as MuscleLoad
}

/**
 * Scales load to 0–1 against the hardest-worked muscle in the same set of
 * data. Relative rather than absolute: a light session should still show
 * which muscles it targeted, and an absolute scale would render an entire
 * deload week as blank.
 */
export function normalizeLoad(load: MuscleLoad): MuscleLoad {
  const values = Object.values(load).filter((v): v is number => v !== undefined)
  const max = Math.max(0, ...values)
  if (max === 0) return {}

  const out: Record<string, number> = {}
  for (const [muscle, value] of Object.entries(load)) {
    if (value !== undefined) out[muscle] = value / max
  }
  return out as MuscleLoad
}

/**
 * Maps intensity to one of five ramp steps.
 *
 * Bucketed rather than a continuous gradient because the ramp has to stay
 * legible at the size of a calendar cell, and because colour is never the only
 * channel — every surface that uses this also labels the muscle in text.
 */
export function heatBucket(intensity: number): 0 | 1 | 2 | 3 | 4 {
  if (intensity <= 0) return 0
  if (intensity < 0.25) return 1
  if (intensity < 0.5) return 2
  if (intensity < 0.75) return 3
  return 4
}

/** Highest-load muscles first — drives the "muscles trained" chips. */
export function topMuscles(load: MuscleLoad, limit = 6) {
  return Object.entries(load)
    .filter(([, value]) => (value ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, limit)
    .map(([id, value]) => ({ id: id as MuscleGroupId, load: value ?? 0 }))
}

/**
 * Which muscles a single exercise works, for the live heat map on the active
 * workout screen. No volume involved — this answers "what am I about to
 * train", not "what have I trained".
 */
export function exerciseActivation(slug: string): MuscleLoad {
  return (EXERCISE_BY_SLUG.get(slug)?.muscles ?? {}) as MuscleLoad
}
