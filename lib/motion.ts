import type { Transition } from 'motion/react'

/**
 * Springs only. Duration-based easing is the tell of a web app pretending to
 * be native — real iOS surfaces move under physics, so everything here is
 * expressed as stiffness/damping/mass rather than a curve and a duration.
 *
 * See docs/04-design-system.md section 6.
 */
export const spring = {
  /** List items, chips, small state changes. */
  snappy: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 },
  /** Cards, sheets, page transitions. */
  smooth: { type: 'spring', stiffness: 260, damping: 28, mass: 1 },
  /** Large surfaces, modal presentation. */
  gentle: { type: 'spring', stiffness: 180, damping: 26, mass: 1.1 },
  /** Badge unlock, PR reveal — the only place with visible overshoot. */
  bouncy: { type: 'spring', stiffness: 320, damping: 18, mass: 0.9 },
} satisfies Record<string, Transition>

/** Press feedback. Applied on the element itself, not a wrapper. */
export const press = {
  whileTap: { scale: 0.97 },
  transition: spring.snappy,
} as const

/** Softer press for large tappable surfaces, where 0.97 reads as a lurch. */
export const pressCard = {
  whileTap: { scale: 0.985 },
  transition: spring.snappy,
} as const

/** Page transition: a short lift and fade. No horizontal push-stack — that
 *  borrows a native navigation metaphor the browser does not actually have. */
export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: spring.smooth,
} as const

/** Bottom sheet presentation. */
export const sheetTransition = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: spring.gentle,
} as const
