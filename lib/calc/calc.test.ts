import { describe, expect, it } from 'vitest'

import {
  formatClock,
  formatDuration,
  formatVolume,
  formatWeight,
  fromDisplayWeight,
  kgToLb,
  lbToKg,
  stepFor,
  toDisplayWeight,
} from './units'
import {
  dailySeries,
  percentDelta,
  setVolume,
  toIsoDate,
  totalReps,
  totalVolume,
  workingSets,
} from './volume'
import {
  bestSet,
  countImprovements,
  estimate1rm,
  findPrs,
  scoreSet,
} from './prs'
import { activeDays, currentStreak, longestStreak } from './streaks'
import {
  accumulateLoad,
  exerciseActivation,
  heatBucket,
  normalizeLoad,
  topMuscles,
} from './muscle-load'

const set = (weight_kg: number, reps: number, is_warmup = false) => ({
  weight_kg,
  reps,
  is_warmup,
})

// ---------------------------------------------------------------------- units

describe('units', () => {
  it('round-trips kg through lb without drift', () => {
    expect(lbToKg(kgToLb(100))).toBeCloseTo(100, 10)
  })

  it('uses real plate increments per system', () => {
    expect(stepFor('metric')).toBe(2.5)
    expect(stepFor('imperial')).toBe(5)
  })

  it('converts only at the display layer', () => {
    expect(toDisplayWeight(100, 'metric')).toBe(100)
    expect(toDisplayWeight(100, 'imperial')).toBe(220.5)
    expect(fromDisplayWeight(220.46, 'imperial')).toBeCloseTo(100, 1)
  })

  it('trims trailing zeros but keeps meaningful decimals', () => {
    expect(formatWeight(60, 'metric')).toBe('60 kg')
    expect(formatWeight(62.5, 'metric')).toBe('62.5 kg')
  })

  it('compacts volume so a stat card cannot overflow', () => {
    expect(formatVolume(8240, 'metric')).toBe('8,240 kg')
    expect(formatVolume(48_500, 'metric')).toBe('48.5k kg')
    expect(formatVolume(1_043_820, 'metric')).toBe('1.04M kg')
  })

  it('formats durations and clocks', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(600)).toBe('10m')
    expect(formatDuration(5400)).toBe('1h 30m')
    expect(formatClock(105)).toBe('1:45')
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(-10)).toBe('0:00')
  })
})

// --------------------------------------------------------------------- volume

describe('volume', () => {
  it('excludes warm-ups everywhere', () => {
    const sets = [set(60, 10), set(20, 10, true), set(60, 8)]
    expect(setVolume(set(20, 10, true))).toBe(0)
    expect(totalVolume(sets)).toBe(60 * 10 + 60 * 8)
    expect(workingSets(sets)).toHaveLength(2)
    expect(totalReps(sets)).toBe(18)
  })

  it('returns a dense series so rest days render as zero, not as gaps', () => {
    const series = dailySeries(
      [{ day: '2026-07-08', volume: 500, sets: 5 }],
      { from: new Date(2026, 6, 6), to: new Date(2026, 6, 12) },
    )
    expect(series).toHaveLength(7)
    expect(series[0]).toEqual({ day: '2026-07-06', volume: 0, sets: 0 })
    expect(series[2]).toEqual({ day: '2026-07-08', volume: 500, sets: 5 })
  })

  it('refuses to invent a percentage for growth from zero', () => {
    expect(percentDelta(100, 50)).toBe(100)
    expect(percentDelta(50, 100)).toBe(-50)
    expect(percentDelta(0, 0)).toBe(0)
    expect(percentDelta(500, 0)).toBeNull()
  })

  it('uses local dates, not UTC', () => {
    // 23:30 local would be the next day in UTC for anyone east of Greenwich.
    expect(toIsoDate(new Date(2026, 6, 12, 23, 30))).toBe('2026-07-12')
  })
})

// ------------------------------------------------------------------------ prs

describe('prs', () => {
  it('returns the actual weight for a single', () => {
    expect(estimate1rm(100, 1)).toBe(100)
  })

  it('applies Epley above one rep', () => {
    expect(estimate1rm(100, 10)).toBeCloseTo(133.33, 2)
  })

  it('treats zero reps as no lift', () => {
    expect(estimate1rm(100, 0)).toBe(0)
  })

  it('scores each record type independently', () => {
    const s = set(100, 5)
    expect(scoreSet(s, 'max_weight')).toBe(100)
    expect(scoreSet(s, 'max_reps')).toBe(5)
    expect(scoreSet(s, 'max_volume')).toBe(500)
    expect(scoreSet(s, 'est_1rm')).toBeCloseTo(116.67, 2)
  })

  it('never scores a warm-up', () => {
    expect(scoreSet(set(100, 5, true), 'max_weight')).toBe(0)
    expect(bestSet([set(100, 5, true)], 'max_weight')).toBeNull()
  })

  it('picks the heaviest set for weight and the longest for reps', () => {
    const sets = [set(100, 3), set(80, 12)]
    expect(bestSet(sets, 'max_weight')?.weight_kg).toBe(100)
    expect(bestSet(sets, 'max_reps')?.reps).toBe(12)
  })

  it('distinguishes a baseline from an improvement', () => {
    const first = findPrs([set(100, 5)], {})
    expect(first).toHaveLength(4)
    expect(first.every((pr) => pr.previous === null)).toBe(true)
    expect(countImprovements(first)).toBe(0)

    const second = findPrs([set(105, 5)], {
      max_weight: 100,
      max_reps: 5,
      max_volume: 500,
      est_1rm: 116.67,
    })
    expect(second.map((pr) => pr.recordType)).toEqual([
      'max_weight',
      'max_volume',
      'est_1rm',
    ])
    expect(countImprovements(second)).toBe(3)
  })

  it('reports nothing when a session beats no existing best', () => {
    expect(
      findPrs([set(90, 5)], {
        max_weight: 100,
        max_reps: 10,
        max_volume: 1000,
        est_1rm: 130,
      }),
    ).toEqual([])
  })
})

// -------------------------------------------------------------------- streaks

describe('streaks', () => {
  const today = new Date(2026, 6, 12)

  it('counts a run ending today', () => {
    expect(
      currentStreak(['2026-07-10', '2026-07-11', '2026-07-12'], today),
    ).toBe(3)
  })

  it('does not punish a today that has not happened yet', () => {
    expect(currentStreak(['2026-07-10', '2026-07-11'], today)).toBe(2)
  })

  it('breaks once a full day is missed', () => {
    expect(currentStreak(['2026-07-09', '2026-07-10'], today)).toBe(0)
  })

  it('collapses several sessions on one day', () => {
    expect(
      currentStreak(
        [new Date(2026, 6, 12, 7), new Date(2026, 6, 12, 19)],
        today,
      ),
    ).toBe(1)
  })

  it('handles an empty history', () => {
    expect(currentStreak([], today)).toBe(0)
    expect(longestStreak([])).toBe(0)
  })

  it('remembers the longest run regardless of today', () => {
    expect(
      longestStreak([
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-04',
        '2026-03-01',
        '2026-03-02',
      ]),
    ).toBe(4)
  })

  it('counts distinct days inside a range', () => {
    expect(
      activeDays(['2026-07-06', '2026-07-06', '2026-07-09', '2026-08-01'], {
        from: new Date(2026, 6, 6),
        to: new Date(2026, 6, 12),
      }),
    ).toBe(2)
  })
})

// ---------------------------------------------------------------- muscle load

describe('muscle load', () => {
  const bench = (weight: number, reps: number, warmup = false) => ({
    exerciseSlug: 'barbell-bench-press',
    weight_kg: weight,
    reps,
    is_warmup: warmup,
  })

  it('weights volume by activation rather than counting it flat', () => {
    const load = accumulateLoad([bench(100, 10)])
    // chest 1.0, front_delts 0.5, triceps 0.5 of 1000kg
    expect(load.chest).toBe(1000)
    expect(load.front_delts).toBe(500)
    expect(load.triceps).toBe(500)
  })

  it('ignores warm-ups and unknown exercises', () => {
    expect(accumulateLoad([bench(100, 10, true)])).toEqual({})
    expect(
      accumulateLoad([
        { exerciseSlug: 'not-a-real-lift', weight_kg: 100, reps: 5, is_warmup: false },
      ]),
    ).toEqual({})
  })

  it('normalizes against the hardest-worked muscle, not an absolute scale', () => {
    const normalized = normalizeLoad(accumulateLoad([bench(100, 10)]))
    expect(normalized.chest).toBe(1)
    expect(normalized.triceps).toBe(0.5)
  })

  it('survives an empty week without dividing by zero', () => {
    expect(normalizeLoad({})).toEqual({})
    expect(topMuscles({})).toEqual([])
  })

  it('buckets intensity into the five ramp steps', () => {
    expect(heatBucket(0)).toBe(0)
    expect(heatBucket(0.1)).toBe(1)
    expect(heatBucket(0.3)).toBe(2)
    expect(heatBucket(0.6)).toBe(3)
    expect(heatBucket(1)).toBe(4)
  })

  it('ranks muscles by load', () => {
    const top = topMuscles(accumulateLoad([bench(100, 10)]))
    expect(top[0]?.id).toBe('chest')
    expect(top).toHaveLength(3)
  })

  it('reads activation for the live heat map without any volume', () => {
    expect(exerciseActivation('barbell-bench-press').chest).toBe(1)
    expect(exerciseActivation('nope')).toEqual({})
  })
})
