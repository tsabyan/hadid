'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Rest timer.
 *
 * State is an absolute `endsAt` timestamp, never a decrementing counter. A
 * counter driven by setInterval desynchronises the moment the tab is
 * backgrounded, the screen locks, or the browser throttles timers — which on
 * a phone between sets is the normal case, not the edge case. Deriving the
 * remainder from a timestamp means the timer is always correct on return,
 * including after a full reload.
 */

type RestTimerState = {
  endsAt: number | null
  durationSeconds: number
  start: (seconds: number) => void
  extend: (seconds: number) => void
  skip: () => void
}

export const useRestTimer = create<RestTimerState>()(
  persist(
    (set, get) => ({
      endsAt: null,
      durationSeconds: 0,
      start: (seconds) =>
        set({ endsAt: Date.now() + seconds * 1000, durationSeconds: seconds }),
      extend: (seconds) => {
        const { endsAt, durationSeconds } = get()
        if (!endsAt) return
        set({
          endsAt: endsAt + seconds * 1000,
          durationSeconds: durationSeconds + seconds,
        })
      },
      skip: () => set({ endsAt: null, durationSeconds: 0 }),
    }),
    { name: 'hadid.rest-timer' },
  ),
)

/**
 * Ticks once a second purely to re-render. The value it produces is always
 * computed from `endsAt`, so a missed tick costs a frame of staleness rather
 * than drifting the clock.
 */
export function useRestRemaining() {
  const endsAt = useRestTimer((s) => s.endsAt)
  const duration = useRestTimer((s) => s.durationSeconds)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!endsAt) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [endsAt])

  if (!endsAt) return { active: false, remaining: 0, progress: 0 }

  const remaining = Math.max(0, (endsAt - now) / 1000)
  const progress = duration > 0 ? 1 - remaining / duration : 1

  return { active: remaining > 0, remaining, progress }
}
