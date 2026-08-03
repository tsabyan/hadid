import { describe, expect, it } from 'vitest'

import { mergeSessions, type MergeableExercise } from './merge'
import { isPermanent } from './retry'

const set = (id: string, n: number, weight = 100, reps = 5) => ({
  id,
  set_number: n,
  weight_kg: weight,
  reps,
  is_warmup: false,
})

const exercise = (
  id: string,
  position: number,
  sets: ReturnType<typeof set>[],
): MergeableExercise => ({
  id,
  name: `Exercise ${id}`,
  position,
  rest_seconds: 120,
  sets,
})

describe('mergeSessions', () => {
  it('keeps sets the server has not seen', () => {
    const server = [exercise('a', 0, [set('s1', 1)])]
    const local = [exercise('a', 0, [set('s1', 1), set('s2', 2)])]

    const merged = mergeSessions(server, local)
    expect(merged[0]?.sets.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('does not duplicate a set present on both sides', () => {
    const server = [exercise('a', 0, [set('s1', 1), set('s2', 2)])]
    const local = [exercise('a', 0, [set('s1', 1), set('s2', 2)])]

    expect(mergeSessions(server, local)[0]?.sets).toHaveLength(2)
  })

  it('is idempotent — merging twice changes nothing', () => {
    const server = [exercise('a', 0, [set('s1', 1)])]
    const local = [exercise('a', 0, [set('s2', 2)])]

    const once = mergeSessions(server, local)
    const twice = mergeSessions(once, local)
    expect(twice).toEqual(once)
  })

  it('keeps exercises added offline', () => {
    const server = [exercise('a', 0, [set('s1', 1)])]
    const local = [
      exercise('a', 0, [set('s1', 1)]),
      exercise('b', 1, [set('s2', 1)]),
    ]

    const merged = mergeSessions(server, local)
    expect(merged.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('prefers the local copy of a set edited offline', () => {
    const server = [exercise('a', 0, [set('s1', 1, 100, 5)])]
    const local = [exercise('a', 0, [set('s1', 1, 110, 5)])]

    expect(mergeSessions(server, local)[0]?.sets[0]?.weight_kg).toBe(110)
  })

  it('orders sets by set_number and exercises by position', () => {
    const server = [exercise('b', 1, [set('s3', 3)])]
    const local = [exercise('a', 0, [set('s1', 1)]), exercise('b', 1, [set('s2', 2)])]

    const merged = mergeSessions(server, local)
    expect(merged.map((e) => e.id)).toEqual(['a', 'b'])
    expect(merged[1]?.sets.map((s) => s.set_number)).toEqual([2, 3])
  })

  it('handles an empty local snapshot', () => {
    const server = [exercise('a', 0, [set('s1', 1)])]
    expect(mergeSessions(server, [])).toEqual(server)
  })

  it('handles a session that only exists locally', () => {
    const local = [exercise('a', 0, [set('s1', 1)])]
    expect(mergeSessions([], local)).toEqual(local)
  })
})

describe('isPermanent', () => {
  it('drops constraint and data violations', () => {
    expect(isPermanent({ message: '', code: '23505' })).toBe(true)
    expect(isPermanent({ message: '', code: '22003' })).toBe(true)
  })

  it('drops RLS denials — retrying cannot grant permission', () => {
    expect(isPermanent({ message: '', code: '42501' })).toBe(true)
  })

  it('retries network failures with no code or status', () => {
    expect(isPermanent({ message: 'Failed to fetch' })).toBe(false)
  })

  it('retries 5xx', () => {
    expect(isPermanent({ message: '', status: 503 })).toBe(false)
  })

  it('retries the 4xx that mean try again', () => {
    expect(isPermanent({ message: '', status: 408 })).toBe(false)
    expect(isPermanent({ message: '', status: 429 })).toBe(false)
  })

  it('drops other 4xx', () => {
    expect(isPermanent({ message: '', status: 400 })).toBe(true)
    expect(isPermanent({ message: '', status: 403 })).toBe(true)
  })
})
