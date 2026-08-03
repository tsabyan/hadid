'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress-ring'
import { chime, haptic } from '@/lib/feedback'
import { formatClock } from '@/lib/calc/units'
import { useRestRemaining, useRestTimer } from '@/lib/stores/rest-timer'
import { spring } from '@/lib/motion'

/**
 * Pinned rest countdown.
 *
 * Fires once when the timer reaches zero — tone, vibration where supported,
 * and an aria-live announcement. The `fired` ref is what keeps it to once:
 * this component re-renders four times a second, and every one of those
 * renders sees remaining === 0 after the timer expires.
 */
export function RestBar() {
  const { active, remaining, progress } = useRestRemaining()
  const endsAt = useRestTimer((s) => s.endsAt)
  const extend = useRestTimer((s) => s.extend)
  const skip = useRestTimer((s) => s.skip)

  const fired = useRef(false)

  useEffect(() => {
    fired.current = false
  }, [endsAt])

  useEffect(() => {
    if (!endsAt || fired.current || remaining > 0) return
    fired.current = true
    chime()
    haptic.success()
  }, [endsAt, remaining])

  const done = endsAt !== null && !active

  return (
    <AnimatePresence>
      {endsAt !== null && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={spring.gentle}
          className="material-thin border-separator pb-safe fixed inset-x-0 bottom-0 z-30 border-t"
        >
          <div className="mx-auto flex max-w-[480px] items-center gap-4 px-5 py-3">
            <ProgressRing progress={progress} size={56} strokeWidth={5}>
              <span className="tabular font-mono text-[13px] font-semibold">
                {formatClock(remaining)}
              </span>
            </ProgressRing>

            <div className="min-w-0 flex-1">
              <p className="text-overline text-text-tertiary uppercase">
                {done ? 'Rest complete' : 'Resting'}
              </p>
              <p
                className="text-title-3 tabular font-mono"
                aria-live="polite"
                aria-atomic="true"
              >
                {done ? 'Ready' : formatClock(remaining)}
              </p>
            </div>

            <Button variant="ghost" size="sm" onClick={() => extend(30)}>
              +30s
            </Button>
            <Button variant="tinted" size="sm" onClick={skip}>
              {done ? 'Dismiss' : 'Skip'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
