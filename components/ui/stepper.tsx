'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

/**
 * `[−] [ 155 ] [+]` — the workhorse of the whole app. Weight and reps are
 * adjusted hundreds of times per session, so this component decides how the
 * app feels more than any screen does.
 *
 * Hold-to-accelerate: 500ms before the first repeat, then 100ms, dropping to
 * 40ms after ten steps. Without acceleration, dialling 20kg up to 100kg is
 * 32 discrete taps.
 *
 * The value field is a real input so a user can type 92.5 instead of tapping
 * to it, and `inputMode="decimal"` gets the numeric keypad on iOS without
 * `type="number"`'s scroll-wheel and validation quirks.
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  decimals = 0,
  label,
  className,
}: {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  decimals?: number
  label?: string
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const timers = useRef<{ delay?: number; repeat?: number }>({})
  const steps = useRef(0)

  const clamp = useCallback(
    (n: number) => Math.min(max, Math.max(min, Number(n.toFixed(decimals)))),
    [min, max, decimals],
  )

  const stopHold = useCallback(() => {
    if (timers.current.delay) window.clearTimeout(timers.current.delay)
    if (timers.current.repeat) window.clearInterval(timers.current.repeat)
    timers.current = {}
    steps.current = 0
  }, [])

  // Timers outlive the component if a pointer is held while navigating away.
  useEffect(() => stopHold, [stopHold])

  const startHold = (direction: 1 | -1) => {
    // Multiplied off the value captured at hold start rather than read fresh
    // each tick. The interval closure cannot see prop updates, so counting
    // total steps is what keeps a long hold from repeating the same increment.
    const bump = () => onChange(clamp(value + direction * step * steps.current))

    onChange(clamp(value + direction * step))
    steps.current = 1

    timers.current.delay = window.setTimeout(() => {
      const tick = (interval: number) => {
        timers.current.repeat = window.setInterval(() => {
          steps.current += 1
          bump()
          if (steps.current === 10) {
            window.clearInterval(timers.current.repeat)
            tick(40)
          }
        }, interval)
      }
      tick(100)
    }, 500)
  }

  const commitDraft = () => {
    if (draft === null) return
    const parsed = Number.parseFloat(draft.replace(',', '.'))
    if (Number.isFinite(parsed)) onChange(clamp(parsed))
    setDraft(null)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-overline text-text-tertiary uppercase">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <StepButton
          onHoldStart={() => startHold(-1)}
          onHoldEnd={stopHold}
          disabled={value <= min}
          aria-label={`Decrease ${label ?? 'value'}`}
        >
          <Minus size={18} strokeWidth={2.5} />
        </StepButton>

        <input
          inputMode="decimal"
          value={draft ?? value.toFixed(decimals)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            'tabular text-title-3 min-w-0 flex-1 bg-transparent text-center',
            'font-mono font-semibold outline-none',
          )}
        />

        <StepButton
          onHoldStart={() => startHold(1)}
          onHoldEnd={stopHold}
          disabled={value >= max}
          aria-label={`Increase ${label ?? 'value'}`}
        >
          <Plus size={18} strokeWidth={2.5} />
        </StepButton>
      </div>
    </div>
  )
}

function StepButton({
  onHoldStart,
  onHoldEnd,
  children,
  ...props
}: {
  onHoldStart: () => void
  onHoldEnd: () => void
} & React.ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        // Keeps the repeat alive if the finger drifts off the button, and
        // guarantees pointerup lands here rather than on whatever is beneath.
        e.currentTarget.setPointerCapture(e.pointerId)
        onHoldStart()
      }}
      onPointerUp={onHoldEnd}
      onPointerCancel={onHoldEnd}
      className={cn(
        'bg-sunken text-text flex size-11 shrink-0 touch-manipulation',
        'items-center justify-center rounded-md',
        'active:brightness-95 disabled:opacity-30',
      )}
      {...props}
    >
      {children}
    </button>
  )
}
