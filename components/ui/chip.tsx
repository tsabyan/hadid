'use client'

import { motion } from 'motion/react'

import { cn } from '@/lib/utils/cn'
import { spring } from '@/lib/motion'

/** Filter pill. Active state carries a tint and weight, never a border. */
export function Chip({
  active,
  className,
  ...props
}: { active?: boolean } & Omit<
  React.ComponentPropsWithoutRef<'button'>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
>) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={spring.snappy}
      aria-pressed={active}
      className={cn(
        'h-[34px] shrink-0 touch-manipulation rounded-full px-3.5',
        'text-subhead transition-colors duration-150',
        active
          ? 'bg-accent-soft text-accent font-semibold'
          : 'bg-sunken text-text-secondary font-medium',
        className,
      )}
      {...props}
    />
  )
}

/** Horizontal chip rail. Scrolls without a visible scrollbar, snaps to items. */
export function ChipRow({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5',
        className,
      )}
      {...props}
    />
  )
}
