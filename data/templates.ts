/**
 * Starter routines, referenced by exercise slug.
 *
 * A blank routine editor is a worse empty state than a slightly wrong plan:
 * editing four exercises into shape is easy, and choosing six from a library
 * of 115 with no starting point is not.
 */

export type RoutineTemplate = {
  id: string
  name: string
  description: string
  exercises: { slug: string; sets: number; reps: number; restSeconds: number }[]
}

export const TEMPLATES: readonly RoutineTemplate[] = [
  {
    id: 'push',
    name: 'Push',
    description: 'Chest, shoulders, triceps',
    exercises: [
      { slug: 'barbell-bench-press', sets: 4, reps: 6, restSeconds: 180 },
      { slug: 'overhead-press', sets: 3, reps: 8, restSeconds: 150 },
      { slug: 'incline-dumbbell-press', sets: 3, reps: 10, restSeconds: 120 },
      { slug: 'lateral-raise', sets: 3, reps: 15, restSeconds: 60 },
      { slug: 'rope-pushdown', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    description: 'Back and biceps',
    exercises: [
      { slug: 'deadlift', sets: 3, reps: 5, restSeconds: 240 },
      { slug: 'pull-up', sets: 4, reps: 8, restSeconds: 150 },
      { slug: 'barbell-row', sets: 3, reps: 8, restSeconds: 150 },
      { slug: 'face-pull', sets: 3, reps: 15, restSeconds: 60 },
      { slug: 'dumbbell-curl', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    description: 'Quads, hamstrings, glutes',
    exercises: [
      { slug: 'back-squat', sets: 4, reps: 6, restSeconds: 210 },
      { slug: 'romanian-deadlift', sets: 3, reps: 8, restSeconds: 150 },
      { slug: 'bulgarian-split-squat', sets: 3, reps: 10, restSeconds: 120 },
      { slug: 'lying-leg-curl', sets: 3, reps: 12, restSeconds: 90 },
      { slug: 'standing-calf-raise', sets: 4, reps: 15, restSeconds: 60 },
    ],
  },
  {
    id: 'upper',
    name: 'Upper Body',
    description: 'Everything above the waist',
    exercises: [
      { slug: 'barbell-bench-press', sets: 4, reps: 6, restSeconds: 180 },
      { slug: 'barbell-row', sets: 4, reps: 8, restSeconds: 150 },
      { slug: 'overhead-press', sets: 3, reps: 8, restSeconds: 150 },
      { slug: 'lat-pulldown', sets: 3, reps: 10, restSeconds: 120 },
      { slug: 'dumbbell-curl', sets: 3, reps: 12, restSeconds: 60 },
      { slug: 'rope-pushdown', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    id: 'full',
    name: 'Full Body',
    description: 'Three big lifts and accessories',
    exercises: [
      { slug: 'back-squat', sets: 3, reps: 5, restSeconds: 210 },
      { slug: 'barbell-bench-press', sets: 3, reps: 5, restSeconds: 180 },
      { slug: 'barbell-row', sets: 3, reps: 8, restSeconds: 150 },
      { slug: 'plank', sets: 3, reps: 1, restSeconds: 60 },
    ],
  },
] as const
