import { RoutineEditor } from '@/components/features/routines/routine-editor'
import { TemplatePicker } from '@/components/features/routines/template-picker'
import { TEMPLATES } from '@/data/templates'
import { getProfile, listExercises } from '@/lib/db/queries'

export default async function NewRoutinePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const [{ template }, library, profile] = await Promise.all([
    searchParams,
    listExercises(),
    getProfile(),
  ])

  if (!template) return <TemplatePicker />

  const preset = TEMPLATES.find((t) => t.id === template)

  // Templates reference slugs; the editor needs real exercise ids. Resolved
  // here rather than in the client, next to the only code that already has
  // the library loaded.
  const initialExercises =
    preset?.exercises.flatMap((row) => {
      const match = library.find((e) => e.slug === row.slug)
      if (!match) return []
      return [
        {
          key: `${row.slug}-${match.id}`,
          exercise_id: match.id,
          name: match.name,
          rest_seconds: row.restSeconds,
          sets: Array.from({ length: row.sets }, () => ({
            target_weight_kg: 0,
            target_reps: row.reps,
            is_warmup: false,
          })),
        },
      ]
    }) ?? []

  return (
    <RoutineEditor
      initialName={preset?.name ?? ''}
      initialExercises={initialExercises}
      library={library}
      hasHistory={false}
      unit={profile?.unit_system ?? 'metric'}
    />
  )
}
