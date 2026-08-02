'use client'

import { useId } from 'react'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils/cn'
import { spring } from '@/lib/motion'

/**
 * iOS-style segmented control: a sunken track with a raised pill that slides
 * between options. The slide is a shared `layoutId`, not a transform on a
 * positioned element — so it stays correct when segments have different
 * widths, which they usually do.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const layoutId = useId()

  return (
    <div
      role="tablist"
      className={cn(
        'bg-sunken flex w-full gap-1 rounded-md p-[3px]',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 touch-manipulation rounded-[9px] px-3 py-2',
              'text-subhead font-semibold transition-colors',
              active ? 'text-text' : 'text-text-secondary',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={spring.snappy}
                className="bg-surface absolute inset-0 rounded-[9px] shadow-sm"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
