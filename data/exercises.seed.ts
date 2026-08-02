import type { MuscleGroupId } from './muscle-groups'

/**
 * The built-in exercise library.
 *
 * This file is the single source of truth. `scripts/gen-seed-sql.mjs` emits
 * the Postgres seed from it, and the app bundles the same array so that search
 * on the Add Exercise screen runs with zero network calls — which is the
 * difference between a picker that feels instant and one that spins in a gym
 * basement.
 *
 * `slug` is the stable identity. Rows are upserted on it, so re-running the
 * seed after editing a name updates in place rather than creating a duplicate.
 *
 * Activation weights drive the muscle heat map. They are coaching estimates,
 * not EMG data: 1.0 is "this is the movement's target", 0.3–0.5 is "this is
 * meaningfully involved". Precision beyond that would be false confidence.
 */

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other'

export type ExerciseType = 'strength' | 'cardio' | 'mobility'

export type SeedExercise = {
  slug: string
  name: string
  aliases?: string[]
  equipment: Equipment
  type: ExerciseType
  unilateral?: boolean
  /** muscle group id → activation 0–1. ≥ 0.7 is stored as `primary`. */
  muscles: Partial<Record<MuscleGroupId, number>>
}

export const PRIMARY_THRESHOLD = 0.7

export const EXERCISES: readonly SeedExercise[] = [
  // ---------------------------------------------------------------- chest
  { slug: 'barbell-bench-press', name: 'Barbell Bench Press', aliases: ['bench', 'bench press', 'bp'], equipment: 'barbell', type: 'strength', muscles: { chest: 1, front_delts: 0.5, triceps: 0.5 } },
  { slug: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press', aliases: ['incline bench'], equipment: 'barbell', type: 'strength', muscles: { chest: 0.9, front_delts: 0.6, triceps: 0.4 } },
  { slug: 'decline-barbell-bench-press', name: 'Decline Barbell Bench Press', aliases: ['decline bench'], equipment: 'barbell', type: 'strength', muscles: { chest: 0.9, triceps: 0.5 } },
  { slug: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', aliases: ['db bench'], equipment: 'dumbbell', type: 'strength', muscles: { chest: 1, front_delts: 0.5, triceps: 0.4 } },
  { slug: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', aliases: ['incline db press'], equipment: 'dumbbell', type: 'strength', muscles: { chest: 0.9, front_delts: 0.6, triceps: 0.4 } },
  { slug: 'decline-dumbbell-press', name: 'Decline Dumbbell Press', equipment: 'dumbbell', type: 'strength', muscles: { chest: 0.9, triceps: 0.4 } },
  { slug: 'dumbbell-fly', name: 'Dumbbell Fly', aliases: ['flye', 'chest fly'], equipment: 'dumbbell', type: 'strength', muscles: { chest: 1, front_delts: 0.3 } },
  { slug: 'incline-dumbbell-fly', name: 'Incline Dumbbell Fly', equipment: 'dumbbell', type: 'strength', muscles: { chest: 0.9, front_delts: 0.4 } },
  { slug: 'cable-fly', name: 'Cable Fly', aliases: ['cable flye'], equipment: 'cable', type: 'strength', muscles: { chest: 1, front_delts: 0.3 } },
  { slug: 'cable-crossover', name: 'Cable Crossover', equipment: 'cable', type: 'strength', muscles: { chest: 1, front_delts: 0.3 } },
  { slug: 'machine-chest-press', name: 'Machine Chest Press', equipment: 'machine', type: 'strength', muscles: { chest: 1, triceps: 0.4, front_delts: 0.4 } },
  { slug: 'pec-deck', name: 'Pec Deck', aliases: ['machine fly'], equipment: 'machine', type: 'strength', muscles: { chest: 1 } },
  { slug: 'push-up', name: 'Push-Up', aliases: ['pushup', 'press up'], equipment: 'bodyweight', type: 'strength', muscles: { chest: 0.9, triceps: 0.5, front_delts: 0.4, abs: 0.3 } },
  { slug: 'chest-dip', name: 'Chest Dip', aliases: ['dips'], equipment: 'bodyweight', type: 'strength', muscles: { chest: 0.9, triceps: 0.6, front_delts: 0.4 } },

  // ----------------------------------------------------------------- back
  { slug: 'deadlift', name: 'Deadlift', aliases: ['conventional deadlift', 'dl'], equipment: 'barbell', type: 'strength', muscles: { lower_back: 0.9, glutes: 0.9, hamstrings: 0.9, traps: 0.5, lats: 0.4, forearms: 0.4, quads: 0.4 } },
  { slug: 'sumo-deadlift', name: 'Sumo Deadlift', equipment: 'barbell', type: 'strength', muscles: { glutes: 0.9, quads: 0.7, hamstrings: 0.6, lower_back: 0.6, adductors: 0.5, traps: 0.4 } },
  { slug: 'rack-pull', name: 'Rack Pull', equipment: 'barbell', type: 'strength', muscles: { lower_back: 0.8, traps: 0.7, glutes: 0.6, lats: 0.4, forearms: 0.4 } },
  { slug: 'barbell-row', name: 'Barbell Row', aliases: ['bent over row', 'bor'], equipment: 'barbell', type: 'strength', muscles: { lats: 0.9, rhomboids: 0.7, traps: 0.5, rear_delts: 0.5, biceps: 0.4, lower_back: 0.4 } },
  { slug: 'pendlay-row', name: 'Pendlay Row', equipment: 'barbell', type: 'strength', muscles: { lats: 0.9, rhomboids: 0.7, traps: 0.5, rear_delts: 0.4, biceps: 0.4 } },
  { slug: 'dumbbell-row', name: 'Dumbbell Row', aliases: ['one arm row', 'db row'], equipment: 'dumbbell', type: 'strength', unilateral: true, muscles: { lats: 1, rhomboids: 0.6, rear_delts: 0.4, biceps: 0.4 } },
  { slug: 't-bar-row', name: 'T-Bar Row', equipment: 'barbell', type: 'strength', muscles: { lats: 0.9, rhomboids: 0.7, traps: 0.5, biceps: 0.4 } },
  { slug: 'chest-supported-row', name: 'Chest-Supported Row', equipment: 'machine', type: 'strength', muscles: { rhomboids: 0.9, lats: 0.8, rear_delts: 0.5, biceps: 0.4 } },
  { slug: 'seated-cable-row', name: 'Seated Cable Row', aliases: ['cable row'], equipment: 'cable', type: 'strength', muscles: { lats: 0.9, rhomboids: 0.7, biceps: 0.4, rear_delts: 0.4 } },
  { slug: 'machine-row', name: 'Machine Row', equipment: 'machine', type: 'strength', muscles: { lats: 0.9, rhomboids: 0.6, biceps: 0.4 } },
  { slug: 'lat-pulldown', name: 'Lat Pulldown', aliases: ['pulldown'], equipment: 'cable', type: 'strength', muscles: { lats: 1, biceps: 0.5, rhomboids: 0.4 } },
  { slug: 'close-grip-lat-pulldown', name: 'Close-Grip Lat Pulldown', equipment: 'cable', type: 'strength', muscles: { lats: 1, biceps: 0.5 } },
  { slug: 'pull-up', name: 'Pull-Up', aliases: ['pullup'], equipment: 'bodyweight', type: 'strength', muscles: { lats: 1, biceps: 0.5, rhomboids: 0.4, abs: 0.3 } },
  { slug: 'chin-up', name: 'Chin-Up', aliases: ['chinup'], equipment: 'bodyweight', type: 'strength', muscles: { lats: 0.9, biceps: 0.7, abs: 0.3 } },
  { slug: 'straight-arm-pulldown', name: 'Straight-Arm Pulldown', equipment: 'cable', type: 'strength', muscles: { lats: 1, triceps: 0.3 } },
  { slug: 'barbell-shrug', name: 'Barbell Shrug', aliases: ['shrug'], equipment: 'barbell', type: 'strength', muscles: { traps: 1, forearms: 0.4 } },
  { slug: 'dumbbell-shrug', name: 'Dumbbell Shrug', equipment: 'dumbbell', type: 'strength', muscles: { traps: 1, forearms: 0.4 } },
  { slug: 'face-pull', name: 'Face Pull', equipment: 'cable', type: 'strength', muscles: { rear_delts: 1, rhomboids: 0.6, traps: 0.4 } },
  { slug: 'back-extension', name: 'Back Extension', aliases: ['hyperextension'], equipment: 'bodyweight', type: 'strength', muscles: { lower_back: 1, glutes: 0.6, hamstrings: 0.5 } },

  // ------------------------------------------------------------ shoulders
  { slug: 'overhead-press', name: 'Overhead Press', aliases: ['ohp', 'military press', 'shoulder press'], equipment: 'barbell', type: 'strength', muscles: { front_delts: 1, side_delts: 0.5, triceps: 0.5, abs: 0.3 } },
  { slug: 'seated-dumbbell-shoulder-press', name: 'Seated Dumbbell Shoulder Press', aliases: ['db shoulder press'], equipment: 'dumbbell', type: 'strength', muscles: { front_delts: 1, side_delts: 0.5, triceps: 0.4 } },
  { slug: 'arnold-press', name: 'Arnold Press', equipment: 'dumbbell', type: 'strength', muscles: { front_delts: 1, side_delts: 0.6, triceps: 0.4 } },
  { slug: 'machine-shoulder-press', name: 'Machine Shoulder Press', equipment: 'machine', type: 'strength', muscles: { front_delts: 1, side_delts: 0.4, triceps: 0.4 } },
  { slug: 'push-press', name: 'Push Press', equipment: 'barbell', type: 'strength', muscles: { front_delts: 0.9, triceps: 0.5, quads: 0.4, abs: 0.3 } },
  { slug: 'lateral-raise', name: 'Lateral Raise', aliases: ['side raise', 'lat raise'], equipment: 'dumbbell', type: 'strength', muscles: { side_delts: 1, traps: 0.3 } },
  { slug: 'cable-lateral-raise', name: 'Cable Lateral Raise', equipment: 'cable', type: 'strength', unilateral: true, muscles: { side_delts: 1 } },
  { slug: 'front-raise', name: 'Front Raise', equipment: 'dumbbell', type: 'strength', muscles: { front_delts: 1 } },
  { slug: 'rear-delt-fly', name: 'Rear Delt Fly', aliases: ['reverse fly'], equipment: 'dumbbell', type: 'strength', muscles: { rear_delts: 1, rhomboids: 0.5 } },
  { slug: 'reverse-pec-deck', name: 'Reverse Pec Deck', equipment: 'machine', type: 'strength', muscles: { rear_delts: 1, rhomboids: 0.5 } },
  { slug: 'upright-row', name: 'Upright Row', equipment: 'barbell', type: 'strength', muscles: { side_delts: 0.9, traps: 0.7, biceps: 0.3 } },

  // --------------------------------------------------------------- biceps
  { slug: 'barbell-curl', name: 'Barbell Curl', aliases: ['bicep curl'], equipment: 'barbell', type: 'strength', muscles: { biceps: 1, forearms: 0.4 } },
  { slug: 'ez-bar-curl', name: 'EZ-Bar Curl', equipment: 'barbell', type: 'strength', muscles: { biceps: 1, forearms: 0.4 } },
  { slug: 'dumbbell-curl', name: 'Dumbbell Curl', aliases: ['db curl'], equipment: 'dumbbell', type: 'strength', muscles: { biceps: 1, forearms: 0.4 } },
  { slug: 'hammer-curl', name: 'Hammer Curl', equipment: 'dumbbell', type: 'strength', muscles: { biceps: 0.9, forearms: 0.7 } },
  { slug: 'incline-dumbbell-curl', name: 'Incline Dumbbell Curl', equipment: 'dumbbell', type: 'strength', muscles: { biceps: 1, forearms: 0.3 } },
  { slug: 'preacher-curl', name: 'Preacher Curl', equipment: 'barbell', type: 'strength', muscles: { biceps: 1, forearms: 0.3 } },
  { slug: 'concentration-curl', name: 'Concentration Curl', equipment: 'dumbbell', type: 'strength', unilateral: true, muscles: { biceps: 1 } },
  { slug: 'cable-curl', name: 'Cable Curl', equipment: 'cable', type: 'strength', muscles: { biceps: 1, forearms: 0.3 } },
  { slug: 'spider-curl', name: 'Spider Curl', equipment: 'dumbbell', type: 'strength', muscles: { biceps: 1 } },

  // -------------------------------------------------------------- triceps
  { slug: 'close-grip-bench-press', name: 'Close-Grip Bench Press', aliases: ['cgbp'], equipment: 'barbell', type: 'strength', muscles: { triceps: 1, chest: 0.6, front_delts: 0.4 } },
  { slug: 'skullcrusher', name: 'Skullcrusher', aliases: ['lying tricep extension'], equipment: 'barbell', type: 'strength', muscles: { triceps: 1 } },
  { slug: 'overhead-tricep-extension', name: 'Overhead Tricep Extension', equipment: 'dumbbell', type: 'strength', muscles: { triceps: 1 } },
  { slug: 'tricep-pushdown', name: 'Tricep Pushdown', aliases: ['pushdown'], equipment: 'cable', type: 'strength', muscles: { triceps: 1 } },
  { slug: 'rope-pushdown', name: 'Rope Pushdown', equipment: 'cable', type: 'strength', muscles: { triceps: 1 } },
  { slug: 'tricep-kickback', name: 'Tricep Kickback', equipment: 'dumbbell', type: 'strength', unilateral: true, muscles: { triceps: 1 } },
  { slug: 'bench-dip', name: 'Bench Dip', equipment: 'bodyweight', type: 'strength', muscles: { triceps: 1, chest: 0.4, front_delts: 0.3 } },
  { slug: 'tricep-dip', name: 'Tricep Dip', equipment: 'bodyweight', type: 'strength', muscles: { triceps: 1, chest: 0.5 } },
  { slug: 'diamond-push-up', name: 'Diamond Push-Up', equipment: 'bodyweight', type: 'strength', muscles: { triceps: 0.9, chest: 0.6 } },

  // ------------------------------------------------------------- forearms
  { slug: 'wrist-curl', name: 'Wrist Curl', equipment: 'dumbbell', type: 'strength', muscles: { forearms: 1 } },
  { slug: 'reverse-wrist-curl', name: 'Reverse Wrist Curl', equipment: 'dumbbell', type: 'strength', muscles: { forearms: 1 } },
  { slug: 'farmers-walk', name: "Farmer's Walk", aliases: ['farmers carry'], equipment: 'dumbbell', type: 'strength', muscles: { forearms: 1, traps: 0.6, abs: 0.4, glutes: 0.3 } },
  { slug: 'reverse-curl', name: 'Reverse Curl', equipment: 'barbell', type: 'strength', muscles: { forearms: 0.9, biceps: 0.6 } },

  // ----------------------------------------------------------------- legs
  { slug: 'back-squat', name: 'Back Squat', aliases: ['squat'], equipment: 'barbell', type: 'strength', muscles: { quads: 1, glutes: 0.8, hamstrings: 0.5, lower_back: 0.4, abs: 0.4, adductors: 0.4 } },
  { slug: 'front-squat', name: 'Front Squat', equipment: 'barbell', type: 'strength', muscles: { quads: 1, glutes: 0.6, abs: 0.5, lower_back: 0.4 } },
  { slug: 'goblet-squat', name: 'Goblet Squat', equipment: 'dumbbell', type: 'strength', muscles: { quads: 0.9, glutes: 0.6, abs: 0.4 } },
  { slug: 'hack-squat', name: 'Hack Squat', equipment: 'machine', type: 'strength', muscles: { quads: 1, glutes: 0.5 } },
  { slug: 'leg-press', name: 'Leg Press', equipment: 'machine', type: 'strength', muscles: { quads: 1, glutes: 0.6, hamstrings: 0.4 } },
  { slug: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', aliases: ['bss', 'rear foot elevated split squat'], equipment: 'dumbbell', type: 'strength', unilateral: true, muscles: { quads: 0.9, glutes: 0.9, hamstrings: 0.4, adductors: 0.3 } },
  { slug: 'walking-lunge', name: 'Walking Lunge', aliases: ['lunge'], equipment: 'dumbbell', type: 'strength', unilateral: true, muscles: { quads: 0.9, glutes: 0.8, hamstrings: 0.4 } },
  { slug: 'reverse-lunge', name: 'Reverse Lunge', equipment: 'dumbbell', type: 'strength', unilateral: true, muscles: { glutes: 0.9, quads: 0.7, hamstrings: 0.4 } },
  { slug: 'step-up', name: 'Step-Up', equipment: 'dumbbell', type: 'strength', unilateral: true, muscles: { quads: 0.9, glutes: 0.8 } },
  { slug: 'romanian-deadlift', name: 'Romanian Deadlift', aliases: ['rdl'], equipment: 'barbell', type: 'strength', muscles: { hamstrings: 1, glutes: 0.8, lower_back: 0.6, forearms: 0.3 } },
  { slug: 'stiff-leg-deadlift', name: 'Stiff-Leg Deadlift', equipment: 'barbell', type: 'strength', muscles: { hamstrings: 1, glutes: 0.7, lower_back: 0.6 } },
  { slug: 'good-morning', name: 'Good Morning', equipment: 'barbell', type: 'strength', muscles: { hamstrings: 0.9, lower_back: 0.8, glutes: 0.6 } },
  { slug: 'leg-extension', name: 'Leg Extension', equipment: 'machine', type: 'strength', muscles: { quads: 1 } },
  { slug: 'lying-leg-curl', name: 'Lying Leg Curl', aliases: ['hamstring curl'], equipment: 'machine', type: 'strength', muscles: { hamstrings: 1, calves: 0.3 } },
  { slug: 'seated-leg-curl', name: 'Seated Leg Curl', equipment: 'machine', type: 'strength', muscles: { hamstrings: 1 } },
  { slug: 'nordic-curl', name: 'Nordic Curl', equipment: 'bodyweight', type: 'strength', muscles: { hamstrings: 1, glutes: 0.4 } },
  { slug: 'hip-thrust', name: 'Hip Thrust', equipment: 'barbell', type: 'strength', muscles: { glutes: 1, hamstrings: 0.5 } },
  { slug: 'glute-bridge', name: 'Glute Bridge', equipment: 'bodyweight', type: 'strength', muscles: { glutes: 1, hamstrings: 0.4 } },
  { slug: 'cable-kickback', name: 'Cable Kickback', equipment: 'cable', type: 'strength', unilateral: true, muscles: { glutes: 1 } },
  { slug: 'standing-calf-raise', name: 'Standing Calf Raise', aliases: ['calf raise'], equipment: 'machine', type: 'strength', muscles: { calves: 1 } },
  { slug: 'seated-calf-raise', name: 'Seated Calf Raise', equipment: 'machine', type: 'strength', muscles: { calves: 1 } },
  { slug: 'adductor-machine', name: 'Adductor Machine', aliases: ['hip adduction'], equipment: 'machine', type: 'strength', muscles: { adductors: 1 } },
  { slug: 'abductor-machine', name: 'Abductor Machine', aliases: ['hip abduction'], equipment: 'machine', type: 'strength', muscles: { glutes: 0.9 } },

  // ----------------------------------------------------------------- core
  { slug: 'plank', name: 'Plank', equipment: 'bodyweight', type: 'strength', muscles: { abs: 1, obliques: 0.5, lower_back: 0.3 } },
  { slug: 'side-plank', name: 'Side Plank', equipment: 'bodyweight', type: 'strength', unilateral: true, muscles: { obliques: 1, abs: 0.5 } },
  { slug: 'hanging-leg-raise', name: 'Hanging Leg Raise', equipment: 'bodyweight', type: 'strength', muscles: { abs: 1, obliques: 0.4, forearms: 0.3 } },
  { slug: 'hanging-knee-raise', name: 'Hanging Knee Raise', equipment: 'bodyweight', type: 'strength', muscles: { abs: 1, forearms: 0.3 } },
  { slug: 'cable-crunch', name: 'Cable Crunch', equipment: 'cable', type: 'strength', muscles: { abs: 1, obliques: 0.3 } },
  { slug: 'crunch', name: 'Crunch', equipment: 'bodyweight', type: 'strength', muscles: { abs: 1 } },
  { slug: 'sit-up', name: 'Sit-Up', equipment: 'bodyweight', type: 'strength', muscles: { abs: 1, obliques: 0.3 } },
  { slug: 'russian-twist', name: 'Russian Twist', equipment: 'bodyweight', type: 'strength', muscles: { obliques: 1, abs: 0.6 } },
  { slug: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', equipment: 'other', type: 'strength', muscles: { abs: 1, lats: 0.4, lower_back: 0.3 } },
  { slug: 'dead-bug', name: 'Dead Bug', equipment: 'bodyweight', type: 'strength', muscles: { abs: 1 } },
  { slug: 'mountain-climber', name: 'Mountain Climber', equipment: 'bodyweight', type: 'strength', muscles: { abs: 0.9, obliques: 0.5, front_delts: 0.3 } },
  { slug: 'pallof-press', name: 'Pallof Press', equipment: 'cable', type: 'strength', unilateral: true, muscles: { obliques: 1, abs: 0.6 } },

  // -------------------------------------------------------------- cardio
  { slug: 'treadmill-run', name: 'Treadmill Run', aliases: ['running', 'run'], equipment: 'machine', type: 'cardio', muscles: { quads: 0.6, calves: 0.6, hamstrings: 0.5, glutes: 0.4 } },
  { slug: 'stationary-bike', name: 'Stationary Bike', aliases: ['cycling', 'bike'], equipment: 'machine', type: 'cardio', muscles: { quads: 0.7, glutes: 0.4, calves: 0.3 } },
  { slug: 'rowing-machine', name: 'Rowing Machine', aliases: ['erg', 'rower'], equipment: 'machine', type: 'cardio', muscles: { lats: 0.6, quads: 0.5, rhomboids: 0.4, biceps: 0.3 } },
  { slug: 'elliptical', name: 'Elliptical', equipment: 'machine', type: 'cardio', muscles: { quads: 0.5, glutes: 0.4, calves: 0.3 } },
  { slug: 'stair-climber', name: 'Stair Climber', equipment: 'machine', type: 'cardio', muscles: { glutes: 0.7, quads: 0.6, calves: 0.4 } },
  { slug: 'jump-rope', name: 'Jump Rope', aliases: ['skipping'], equipment: 'other', type: 'cardio', muscles: { calves: 0.8, quads: 0.4 } },

  // ------------------------------------------------------------ mobility
  { slug: 'arm-circles', name: 'Arm Circles', equipment: 'bodyweight', type: 'mobility', muscles: { front_delts: 0.4, side_delts: 0.4, rear_delts: 0.3 } },
  { slug: 'band-pass-through', name: 'Band Pass-Through', equipment: 'band', type: 'mobility', muscles: { front_delts: 0.4, rear_delts: 0.4, traps: 0.3 } },
  { slug: 'scapular-wall-slide', name: 'Scapular Wall Slide', equipment: 'bodyweight', type: 'mobility', muscles: { rhomboids: 0.5, traps: 0.4, rear_delts: 0.3 } },
  { slug: 'cat-cow', name: 'Cat-Cow', equipment: 'bodyweight', type: 'mobility', muscles: { lower_back: 0.4, abs: 0.3 } },
  { slug: 'worlds-greatest-stretch', name: "World's Greatest Stretch", equipment: 'bodyweight', type: 'mobility', unilateral: true, muscles: { adductors: 0.4, glutes: 0.4, obliques: 0.3 } },
  { slug: 'hip-flexor-stretch', name: 'Hip Flexor Stretch', equipment: 'bodyweight', type: 'mobility', unilateral: true, muscles: { quads: 0.3, glutes: 0.3 } },
  { slug: 'thoracic-rotation', name: 'Thoracic Rotation', equipment: 'bodyweight', type: 'mobility', unilateral: true, muscles: { obliques: 0.4, lower_back: 0.3 } },
  { slug: 'leg-swing', name: 'Leg Swing', equipment: 'bodyweight', type: 'mobility', unilateral: true, muscles: { hamstrings: 0.3, glutes: 0.3, adductors: 0.3 } },
] as const

export const EXERCISE_BY_SLUG = new Map(EXERCISES.map((e) => [e.slug, e]))
