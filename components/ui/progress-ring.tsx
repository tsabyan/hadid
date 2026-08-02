import { cn } from '@/lib/utils/cn'

/**
 * Circular progress. Rotated -90deg so it fills from twelve o'clock.
 *
 * The transition here is linear and stays linear under reduced motion: when
 * this drives the rest timer it represents elapsed time, and a spring would
 * make it lie about how much rest is left.
 */
export function ProgressRing({
  progress,
  size = 72,
  strokeWidth = 6,
  children,
  className,
}: {
  /** 0–1 */
  progress: number
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 200ms linear' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
