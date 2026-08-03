'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, MoreHorizontal, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Sheet } from '@/components/ui/sheet'
import { archiveRoutine, startWorkout } from '@/lib/db/mutations'
import type { RoutineListItem } from '@/lib/db/queries'

export function RoutineList({ routines }: { routines: RoutineListItem[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [menuFor, setMenuFor] = useState<RoutineListItem | null>(null)

  function begin(routineId: string) {
    startTransition(async () => {
      const id = await startWorkout({ routineId })
      router.push(`/workout/${id}`)
    })
  }

  if (routines.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={Dumbbell}
          title="No routines yet"
          description="Build one from a template, or start from an empty plan."
          action={
            <Button variant="tinted" onClick={() => router.push('/routines/new')}>
              Create routine
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {routines.map((routine) => {
          const version = routine.routine_versions[0]
          const count = version?.routine_exercises.length ?? 0

          return (
            <Card
              key={routine.id}
              interactive
              className="flex items-center gap-3 py-4"
              onClick={() => begin(routine.id)}
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-title-3 truncate">{routine.name}</h3>
                <p className="text-footnote text-text-secondary">
                  {count} {count === 1 ? 'exercise' : 'exercises'}
                  {count > 0 && ` · ~${estimateMinutes(count)} min`}
                </p>
              </div>

              <button
                aria-label={`Options for ${routine.name}`}
                onClick={(event) => {
                  // The card itself starts a workout. Without this the menu
                  // would launch a session on its way to opening.
                  event.stopPropagation()
                  setMenuFor(routine)
                }}
                className="text-text-tertiary flex size-11 items-center justify-center"
              >
                <MoreHorizontal size={20} />
              </button>

              <div className="bg-accent-soft text-accent flex size-11 items-center justify-center rounded-full">
                <Play size={18} fill="currentColor" />
              </div>
            </Card>
          )
        })}
      </div>

      <Sheet
        open={menuFor !== null}
        onOpenChange={(open) => !open && setMenuFor(null)}
        title={menuFor?.name ?? ''}
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              router.push(`/routines/${menuFor?.id}/edit`)
              setMenuFor(null)
            }}
          >
            Edit routine
          </Button>
          <Button
            variant="destructive"
            fullWidth
            disabled={pending}
            onClick={() => {
              const id = menuFor?.id
              setMenuFor(null)
              if (id) startTransition(() => archiveRoutine(id))
            }}
          >
            Archive
          </Button>
        </div>
      </Sheet>
    </>
  )
}

/**
 * Rough, and labelled as such with a "~". Roughly three working sets plus rest
 * per exercise lands close enough to be useful for planning an evening, and
 * anything more precise would be false precision over data we do not have.
 */
const estimateMinutes = (exerciseCount: number) =>
  Math.max(10, Math.round(exerciseCount * 7))
