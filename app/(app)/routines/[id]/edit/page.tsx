import { notFound } from 'next/navigation'

import { RoutineEditor } from '@/components/features/routines/routine-editor'
import {
  getCurrentRoutineVersion,
  getProfile,
  listExercises,
  routineHasHistory,
} from '@/lib/db/queries'

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [version, library, profile, hasHistory] = await Promise.all([
    getCurrentRoutineVersion(id),
    listExercises(),
    getProfile(),
    routineHasHistory(id),
  ])

  if (!version) notFound()

  const initialExercises = [...version.routine_exercises]
    .sort((a, b) => a.position - b.position)
    .map((row) => {
      const exercise = row.exercise as unknown as { name: string } | null
      return {
        key: row.id,
        exercise_id:
          (row.exercise as unknown as { id: string } | null)?.id ?? '',
        name: exercise?.name ?? 'Unknown exercise',
        rest_seconds: row.rest_seconds ?? 120,
        sets: [...row.routine_sets]
          .sort((a, b) => a.set_number - b.set_number)
          .map((set) => ({
            target_weight_kg: Number(set.target_weight_kg ?? 0),
            target_reps: set.target_reps ?? 8,
            is_warmup: set.is_warmup,
          })),
      }
    })

  return (
    <RoutineEditor
      routineId={id}
      initialName={(version.routine as { name: string } | null)?.name ?? ''}
      initialExercises={initialExercises}
      library={library}
      hasHistory={hasHistory}
      unit={profile?.unit_system ?? 'metric'}
    />
  )
}
