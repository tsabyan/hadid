'use client'

import { motion } from 'motion/react'

import { cn } from '@/lib/utils/cn'
import { spring } from '@/lib/motion'

/**
 * Surface with soft elevation and no border in light mode — depth comes from
 * light, not lines. In dark mode a hairline top edge does the separating,
 * because shadows barely register against a dark background.
 */
export function Card({
  interactive,
  className,
  ...props
}: { interactive?: boolean } & Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
>) {
  return (
    <motion.div
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={spring.snappy}
      className={cn(
        'bg-surface rounded-lg p-5 shadow-sm',
        'dark:border-line dark:border-t',
        interactive && 'cursor-pointer touch-manipulation hover:shadow-md',
        className,
      )}
      {...props}
    />
  )
}
