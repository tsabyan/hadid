'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Stepper } from '@/components/ui/stepper'
import {
  ExercisePicker,
  type PickableExercise,
} from '@/components/features/exercises/exercise-picker'
import { createRoutine, saveRoutineVersion } from '@/lib/db/mutations'
import { spring } from '@/lib/motion'
import { stepFor, unitLabel, type UnitSystem } from '@/lib/calc/units'
import { cn } from '@/lib/utils/cn'

export type EditorSet = {
  target_weight_kg: number
  target_reps: number
  is_warmup: boolean
}

export type EditorExercise = {
  /** Stable across reorders. Array index cannot be a dnd id — it changes. */
  key: string
  exercise_id: string
  name: string
  rest_seconds: number
  sets: EditorSet[]
}

export function RoutineEditor({
  routineId,
  initialName,
  initialExercises,
  library,
  hasHistory,
  unit,
}: {
  routineId?: string
  initialName: string
  initialExercises: EditorExercise[]
  library: PickableExercise[]
  hasHistory: boolean
  unit: UnitSystem
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(initialName)
  const [exercises, setExercises] = useState(initialExercises)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    // 8px of slack so a scroll gesture is not read as a drag. Without it the
    // list becomes impossible to scroll on a phone.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setExercises((current) => {
      const from = current.findIndex((e) => e.key === active.id)
      const to = current.findIndex((e) => e.key === over.id)
      return from < 0 || to < 0 ? current : arrayMove(current, from, to)
    })
  }

  function addExercises(ids: string[]) {
    const additions = ids.flatMap((id) => {
      const found = library.find((e) => e.id === id)
      if (!found) return []
      return [
        {
          key: crypto.randomUUID(),
          exercise_id: id,
          name: found.name,
          rest_seconds: 120,
          sets: [{ target_weight_kg: 0, target_reps: 8, is_warmup: false }],
        } satisfies EditorExercise,
      ]
    })
    setExercises((current) => [...current, ...additions])
  }

  function patch(key: string, next: Partial<EditorExercise>) {
    setExercises((current) =>
      current.map((e) => (e.key === key ? { ...e, ...next } : e)),
    )
  }

  function save(asNewVersion: boolean) {
    setError(null)

    const payload = {
      name: name.trim() || 'Untitled routine',
      exercises: exercises.map((e) => ({
        exercise_id: e.exercise_id,
        rest_seconds: e.rest_seconds,
        superset_with_next: false,
        sets: e.sets.map((s) => ({
          target_weight_kg: s.target_weight_kg,
          target_reps: s.target_reps,
          is_warmup: s.is_warmup,
        })),
      })),
    }

    startTransition(async () => {
      try {
        if (routineId) await saveRoutineVersion(routineId, payload, asNewVersion)
        else await createRoutine(payload)
        router.push('/')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not save.')
      }
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="material-thin border-separator pt-safe sticky top-0 z-20 border-b">
        <div className="flex h-11 items-center gap-2 px-2">
          <button
            onClick={() => router.back()}
            aria-label="Cancel"
            className="text-text-secondary flex size-11 items-center justify-center"
          >
            <X size={22} />
          </button>
          <h1 className="text-headline flex-1 text-center">
            {routineId ? 'Edit Routine' : 'New Routine'}
          </h1>
          <div className="size-11" />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-40">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Routine name"
          className="text-title-1 w-full bg-transparent outline-none placeholder:text-[var(--text-tertiary)]"
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext
            items={exercises.map((e) => e.key)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-3">
              {exercises.map((exercise, index) => (
                <SortableExercise
                  key={exercise.key}
                  exercise={exercise}
                  index={index}
                  unit={unit}
                  collapsed={collapsed.has(exercise.key)}
                  onToggleCollapse={() =>
                    setCollapsed((current) => {
                      const next = new Set(current)
                      if (next.has(exercise.key)) next.delete(exercise.key)
                      else next.add(exercise.key)
                      return next
                    })
                  }
                  onPatch={(next) => patch(exercise.key, next)}
                  onRemove={() =>
                    setExercises((current) =>
                      current.filter((e) => e.key !== exercise.key),
                    )
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <Button variant="tinted" fullWidth onClick={() => setPickerOpen(true)}>
          <Plus size={18} /> Add exercise
        </Button>

        {error && <p className="text-footnote text-danger">{error}</p>}
      </div>

      <div className="material-thin border-separator pb-safe fixed inset-x-0 bottom-0 z-20 border-t">
        <div className="mx-auto flex max-w-[480px] gap-2 px-5 py-3">
          {/* The choice only appears once there is history to protect.
              Versioning an untouched routine is a concept nobody asked for. */}
          {hasHistory && (
            <Button
              variant="secondary"
              className="flex-1"
              disabled={pending}
              onClick={() => save(true)}
            >
              New version
            </Button>
          )}
          <Button
            variant="primary"
            className="flex-1"
            disabled={pending || exercises.length === 0}
            onClick={() => save(false)}
          >
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={library}
        onConfirm={addExercises}
      />
    </div>
  )
}

function SortableExercise({
  exercise,
  index,
  unit,
  collapsed,
  onToggleCollapse,
  onPatch,
  onRemove,
}: {
  exercise: EditorExercise
  index: number
  unit: UnitSystem
  collapsed: boolean
  onToggleCollapse: () => void
  onPatch: (next: Partial<EditorExercise>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.key })

  const weightStep = stepFor(unit)

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10')}
    >
      <Card className={cn('p-0', isDragging && 'shadow-lg')}>
        <div className="flex items-center gap-2 p-3">
          <button
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${exercise.name}`}
            className="text-text-tertiary flex size-9 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </button>

          <span className="tabular text-footnote text-text-tertiary font-mono">
            {index + 1}
          </span>

          <button
            onClick={onToggleCollapse}
            className="min-w-0 flex-1 text-left"
          >
            <div className="text-headline truncate">{exercise.name}</div>
            <div className="text-footnote text-text-secondary">
              {exercise.sets.length}{' '}
              {exercise.sets.length === 1 ? 'set' : 'sets'} · {exercise.rest_seconds}s rest
            </div>
          </button>

          <motion.span
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={spring.snappy}
            className="text-text-tertiary"
          >
            <ChevronDown size={18} />
          </motion.span>

          <button
            onClick={onRemove}
            aria-label={`Remove ${exercise.name}`}
            className="text-text-tertiary flex size-9 items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {!collapsed && (
          <div className="border-separator flex flex-col gap-3 border-t p-3">
            {exercise.sets.map((set, setIndex) => (
              <div key={setIndex} className="flex items-end gap-2">
                <span className="tabular text-footnote text-text-tertiary w-5 pb-3 font-mono">
                  {setIndex + 1}
                </span>
                <Stepper
                  label={unitLabel(unit)}
                  value={set.target_weight_kg}
                  step={weightStep}
                  decimals={weightStep % 1 === 0 ? 0 : 1}
                  onChange={(value) =>
                    onPatch({
                      sets: exercise.sets.map((s, i) =>
                        i === setIndex ? { ...s, target_weight_kg: value } : s,
                      ),
                    })
                  }
                  className="flex-1"
                />
                <Stepper
                  label="Reps"
                  value={set.target_reps}
                  max={100}
                  onChange={(value) =>
                    onPatch({
                      sets: exercise.sets.map((s, i) =>
                        i === setIndex ? { ...s, target_reps: value } : s,
                      ),
                    })
                  }
                  className="flex-1"
                />
                <button
                  onClick={() =>
                    onPatch({
                      sets: exercise.sets.filter((_, i) => i !== setIndex),
                    })
                  }
                  aria-label={`Remove set ${setIndex + 1}`}
                  className="text-text-tertiary flex size-11 items-center justify-center pb-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <button
              onClick={() =>
                onPatch({
                  sets: [
                    ...exercise.sets,
                    exercise.sets[exercise.sets.length - 1] ?? {
                      target_weight_kg: 0,
                      target_reps: 8,
                      is_warmup: false,
                    },
                  ],
                })
              }
              className="text-accent text-subhead py-2 font-semibold"
            >
              + Add set
            </button>

            <div className="border-separator flex items-center justify-between border-t pt-3">
              <span className="text-overline text-text-tertiary uppercase">
                Rest
              </span>
              <Stepper
                value={exercise.rest_seconds}
                step={15}
                max={900}
                onChange={(value) => onPatch({ rest_seconds: value })}
                className="w-40"
              />
            </div>
          </div>
        )}
      </Card>
    </li>
  )
}
