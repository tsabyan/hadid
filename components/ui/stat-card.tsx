import { cn } from '@/lib/utils/cn'

/**
 * Headline metric with an optional period-over-period delta.
 *
 * A negative delta is rendered in neutral grey, not red. A lighter training
 * week is information, and colouring it as a failure is a judgement the app
 * has no business making.
 */
export function StatCard({
  label,
  value,
  sub,
  delta,
  icon,
  className,
}: {
  label: string
  value: string | number
  sub?: string
  /** Percentage change vs. the previous period. */
  delta?: number
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-surface flex min-w-[128px] flex-col gap-1 rounded-lg p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-overline text-text-tertiary uppercase">
          {label}
        </span>
        {icon}
      </div>

      <span className="tabular text-title-1 font-mono font-semibold">
        {value}
      </span>

      <div className="flex items-center gap-1.5">
        {sub && (
          <span className="text-footnote text-text-secondary">{sub}</span>
        )}
        {delta !== undefined && (
          <span
            className={cn(
              'text-caption rounded-full px-1.5 py-0.5 font-semibold',
              delta >= 0
                ? 'bg-success/12 text-success'
                : 'bg-sunken text-text-secondary',
            )}
          >
            {delta >= 0 ? '↑' : '↓'} {Math.abs(Math.round(delta))}%
          </span>
        )}
      </div>
    </div>
  )
}
