'use client'

import { useState } from 'react'
import { motion } from 'motion/react'

import { formatVolume, type UnitSystem } from '@/lib/calc/units'
import { cn } from '@/lib/utils/cn'

/**
 * Daily volume bars with a trend line.
 *
 * Hand-written rather than charted by a library. A charting dependency costs
 * 40–100KB to draw eleven rectangles and a polyline, and every one of them
 * fights the design tokens over fonts, colours, and tooltip chrome.
 *
 * Layout is a CSS grid, not an SVG coordinate system — the bars need to be
 * real tappable elements with accessible labels, and text inside SVG never
 * quite matches the rest of the type scale.
 */

export type VolumePoint = {
  day: string
  volume: number
  sets: number
  label: string
}

export function VolumeChart({
  points,
  unit,
  className,
}: {
  points: VolumePoint[]
  unit: UnitSystem
  className?: string
}) {
  const [selected, setSelected] = useState<number | null>(null)

  const max = Math.max(...points.map((p) => p.volume), 0)
  const active = selected !== null ? points[selected] : null

  if (max === 0) {
    return (
      <div
        className={cn(
          'text-subhead text-text-secondary flex h-[168px] items-center justify-center',
          className,
        )}
      >
        No volume logged this period.
      </div>
    )
  }

  // Trend line is drawn in its own SVG overlaid on the grid, using percentage
  // coordinates so it stays aligned with the bars at any width.
  const trend = movingAverage(points.map((p) => p.volume), 3)
  const trendPath = trend
    .map((value, i) => {
      const x = ((i + 0.5) / points.length) * 100
      const y = 100 - (value / max) * 100
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-footnote text-text-secondary">
          {active ? active.label : 'Peak'}
        </span>
        <span className="tabular text-footnote font-mono">
          {formatVolume(active ? active.volume : max, unit)}
          {active && active.sets > 0 && (
            <span className="text-text-tertiary"> · {active.sets} sets</span>
          )}
        </span>
      </div>

      <div className="relative h-[132px]">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path
            d={trendPath}
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.7"
          />
        </svg>

        <div
          className="grid h-full items-end gap-1"
          style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}
        >
          {points.map((point, i) => {
            const height = (point.volume / max) * 100
            return (
              <button
                key={point.day}
                onClick={() => setSelected(selected === i ? null : i)}
                aria-label={`${point.label}: ${formatVolume(point.volume, unit)}, ${point.sets} sets`}
                className="group relative flex h-full items-end"
              >
                {/* Track shows the day's share of the peak. Without it a light
                    day reads as a missing column rather than a light day. */}
                <span className="bg-sunken absolute inset-x-0 bottom-0 top-0 rounded-sm" />
                <motion.span
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, point.volume > 0 ? 3 : 0)}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    delay: i * 0.03,
                  }}
                  className={cn(
                    'relative w-full rounded-sm',
                    selected === i ? 'bg-accent-hover' : 'bg-accent',
                  )}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}
      >
        {points.map((point, i) => (
          <span
            key={point.day}
            className={cn(
              'text-caption text-center',
              selected === i ? 'text-accent font-semibold' : 'text-text-tertiary',
            )}
          >
            {point.label.slice(0, 1)}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Centred moving average.
 *
 * A trend line that simply retraces the bars adds nothing. Smoothing over
 * three days is enough to show direction through the normal push/pull/rest
 * sawtooth without flattening a genuine change in workload.
 */
function movingAverage(values: number[], window: number): number[] {
  const half = Math.floor(window / 2)
  return values.map((_, i) => {
    const from = Math.max(0, i - half)
    const to = Math.min(values.length, i + half + 1)
    const slice = values.slice(from, to)
    return slice.reduce((sum, v) => sum + v, 0) / slice.length
  })
}
