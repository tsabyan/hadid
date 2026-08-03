import { notFound } from 'next/navigation'

import { WorkoutLogger } from '@/components/features/workout/workout-logger'
import { getProfile, getWorkout, listExercises } from '@/lib/db/queries'

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [workout, library, profile] = await Promise.all([
    getWorkout(id),
    listExercises(),
    getProfile(),
  ])

  if (!workout) notFound()

  const exercises = [...workout.workout_exercises]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.id,
      name:
        (row.exercise as unknown as { name: string } | null)?.name ??
        'Unknown exercise',
      position: row.position,
      rest_seconds: row.rest_seconds,
      sets: [...row.sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          id: set.id,
          set_number: set.set_number,
          weight_kg: Number(set.weight_kg),
          reps: set.reps,
          is_warmup: set.is_warmup,
        })),
    }))

  return (
    <WorkoutLogger
      workoutId={workout.id}
      workoutName={workout.name}
      initialExercises={exercises}
      library={library}
      unit={profile?.unit_system ?? 'metric'}
      defaultRestSeconds={profile?.default_rest_seconds ?? 120}
    />
  )
}
