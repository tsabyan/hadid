/**
 * Unit conversion and display.
 *
 * Everything is stored in kilograms. Conversion happens at the display layer
 * only, so a user who switches to pounds mid-training-block does not
 * retroactively change what their history says they lifted.
 */

export type UnitSystem = 'metric' | 'imperial'

const LB_PER_KG = 2.2046226218

export const kgToLb = (kg: number) => kg * LB_PER_KG
export const lbToKg = (lb: number) => lb / LB_PER_KG

/** Smallest sensible adjustment: 2.5kg or 5lb, matching real plate pairs. */
export const stepFor = (unit: UnitSystem) => (unit === 'metric' ? 2.5 : 5)

export function toDisplayWeight(kg: number, unit: UnitSystem): number {
  const value = unit === 'metric' ? kg : kgToLb(kg)
  // One decimal, and only when it earns its place: 60 not 60.0, 62.5 not 62.
  return Math.round(value * 10) / 10
}

export function fromDisplayWeight(value: number, unit: UnitSystem): number {
  const kg = unit === 'metric' ? value : lbToKg(value)
  return Math.round(kg * 100) / 100
}

export const unitLabel = (unit: UnitSystem) => (unit === 'metric' ? 'kg' : 'lb')

export function formatWeight(kg: number, unit: UnitSystem): string {
  const value = toDisplayWeight(kg, unit)
  return `${trimZero(value)} ${unitLabel(unit)}`
}

/**
 * Volume runs to six and seven figures fast, and a stat card cannot show
 * "1043820 kg" without wrecking the layout. Thousands separators below 10k,
 * compact notation above.
 */
export function formatVolume(kg: number, unit: UnitSystem): string {
  const value = toDisplayWeight(kg, unit)
  const label = unitLabel(unit)
  if (value >= 1_000_000) return `${trimZero(round(value / 1_000_000, 2))}M ${label}`
  if (value >= 10_000) return `${trimZero(round(value / 1000, 1))}k ${label}`
  return `${Math.round(value).toLocaleString('en-US')} ${label}`
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

/** mm:ss for the rest timer. Always two digits of seconds. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

const round = (n: number, places: number) => {
  const f = 10 ** places
  return Math.round(n * f) / f
}

const trimZero = (n: number) => String(n).replace(/\.0+$/, '')
