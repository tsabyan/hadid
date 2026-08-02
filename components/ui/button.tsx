'use client'

import { motion } from 'motion/react'

import { cn } from '@/lib/utils/cn'
import { spring } from '@/lib/motion'

type Variant = 'primary' | 'secondary' | 'tinted' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-text hover:bg-accent-hover',
  secondary: 'bg-surface text-text shadow-sm hover:brightness-[0.98]',
  tinted: 'bg-accent-soft text-accent hover:brightness-[0.97]',
  ghost: 'bg-transparent text-text-secondary hover:bg-sunken',
  destructive: 'bg-transparent text-danger hover:bg-danger/8',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-subhead rounded-md',
  md: 'h-11 px-4 text-callout rounded-md',
  lg: 'h-13 px-5 text-body rounded-lg',
}

/**
 * One `primary` per screen. If a screen has two, one of them is not primary.
 *
 * Minimum tap target is 44x44 regardless of visual size, so `sm` keeps a
 * transparent expansion via padding rather than shrinking the hit area.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth,
  className,
  ...props
}: {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
} & Omit<
  React.ComponentPropsWithoutRef<'button'>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
>) {
  return (
    <motion.button
      whileTap={{ scale: props.disabled ? 1 : 0.97 }}
      transition={spring.snappy}
      className={cn(
        'inline-flex touch-manipulation items-center justify-center gap-2 font-semibold',
        'transition-[background-color,filter] duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        size === 'lg' && 'rounded-lg',
        className,
      )}
      {...props}
    />
  )
}
