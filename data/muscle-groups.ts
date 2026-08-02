/**
 * Muscle groups — the vocabulary shared by the exercise library, the heat
 * maps, and the training-load charts.
 *
 * `svgGroup` must match a `<g id>` in the anatomy SVG built in Phase 5. That
 * coupling is the reason these IDs are stable strings rather than generated
 * UUIDs: a renamed muscle silently breaks tinting on a diagram, which is far
 * harder to notice than a broken query.
 */

export type Region = 'upper' | 'lower' | 'core'
export type BodySide = 'front' | 'back' | 'both'

export type MuscleGroup = {
  id: string
  name: string
  region: Region
  bodySide: BodySide
  svgGroup: string
}

export const MUSCLE_GROUPS = [
  // Upper — front
  { id: 'chest', name: 'Chest', region: 'upper', bodySide: 'front', svgGroup: 'chest' },
  { id: 'front_delts', name: 'Front Delts', region: 'upper', bodySide: 'front', svgGroup: 'front-delts' },
  { id: 'biceps', name: 'Biceps', region: 'upper', bodySide: 'front', svgGroup: 'biceps' },

  // Upper — back
  { id: 'lats', name: 'Lats', region: 'upper', bodySide: 'back', svgGroup: 'lats' },
  { id: 'traps', name: 'Traps', region: 'upper', bodySide: 'back', svgGroup: 'traps' },
  { id: 'rhomboids', name: 'Rhomboids', region: 'upper', bodySide: 'back', svgGroup: 'rhomboids' },
  { id: 'rear_delts', name: 'Rear Delts', region: 'upper', bodySide: 'back', svgGroup: 'rear-delts' },
  { id: 'triceps', name: 'Triceps', region: 'upper', bodySide: 'back', svgGroup: 'triceps' },

  // Upper — both
  { id: 'side_delts', name: 'Side Delts', region: 'upper', bodySide: 'both', svgGroup: 'side-delts' },
  { id: 'forearms', name: 'Forearms', region: 'upper', bodySide: 'both', svgGroup: 'forearms' },

  // Core
  { id: 'abs', name: 'Abs', region: 'core', bodySide: 'front', svgGroup: 'abs' },
  { id: 'obliques', name: 'Obliques', region: 'core', bodySide: 'front', svgGroup: 'obliques' },
  { id: 'lower_back', name: 'Lower Back', region: 'core', bodySide: 'back', svgGroup: 'lower-back' },

  // Lower
  { id: 'quads', name: 'Quads', region: 'lower', bodySide: 'front', svgGroup: 'quads' },
  { id: 'hamstrings', name: 'Hamstrings', region: 'lower', bodySide: 'back', svgGroup: 'hamstrings' },
  { id: 'glutes', name: 'Glutes', region: 'lower', bodySide: 'back', svgGroup: 'glutes' },
  { id: 'calves', name: 'Calves', region: 'lower', bodySide: 'both', svgGroup: 'calves' },
  { id: 'adductors', name: 'Adductors', region: 'lower', bodySide: 'front', svgGroup: 'adductors' },
] as const satisfies readonly MuscleGroup[]

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]['id']

/**
 * The seven filter chips on the Add Exercise screen. Fewer, broader buckets
 * than the 18 anatomical groups — nobody browses a library by "rhomboids".
 */
export const MUSCLE_CATEGORIES = [
  { id: 'chest', label: 'Chest', groups: ['chest'] },
  { id: 'back', label: 'Back', groups: ['lats', 'traps', 'rhomboids', 'lower_back'] },
  { id: 'legs', label: 'Legs', groups: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'] },
  { id: 'shoulders', label: 'Shoulders', groups: ['front_delts', 'side_delts', 'rear_delts'] },
  { id: 'arms', label: 'Arms', groups: ['biceps', 'triceps', 'forearms'] },
  { id: 'core', label: 'Core', groups: ['abs', 'obliques'] },
] as const satisfies readonly {
  id: string
  label: string
  groups: readonly MuscleGroupId[]
}[]

export type MuscleCategoryId = (typeof MUSCLE_CATEGORIES)[number]['id']

export const MUSCLE_GROUP_BY_ID: Record<string, MuscleGroup> =
  Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.id, m]))
