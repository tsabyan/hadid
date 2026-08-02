'use client'

import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

/**
 * Grouped-list row. The separator is inset to align with the text rather than
 * running full-bleed — the inset is what makes a list read as iOS instead of
 * as a table.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  chevron,
  className,
  ...props
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  chevron?: boolean
} & React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'flex min-h-14 touch-manipulation items-center gap-3 px-4 py-2.5',
        'active:bg-sunken transition-colors',
        className,
      )}
      {...props}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="text-headline truncate">{title}</div>
        {subtitle && (
          <div className="text-footnote text-text-secondary truncate">
            {subtitle}
          </div>
        )}
      </div>
      {trailing}
      {chevron && (
        <ChevronRight
          size={18}
          className="text-text-tertiary shrink-0"
          aria-hidden
        />
      )}
    </div>
  )
}

/** Wraps rows and draws the inset hairlines between them. */
export function ListGroup({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'bg-surface overflow-hidden rounded-lg shadow-sm',
        // Hairline drawn as an inset pseudo-element rather than border-t,
        // which would run edge to edge and read as a table.
        '[&>*+*]:relative',
        '[&>*+*]:before:bg-separator [&>*+*]:before:absolute',
        '[&>*+*]:before:inset-x-4 [&>*+*]:before:top-0 [&>*+*]:before:h-px',
        className,
      )}
      {...props}
    />
  )
}
