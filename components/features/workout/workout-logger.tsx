'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sheet } from '@/components/ui/sheet'
import { Stepper } from '@/components/ui/stepper'
import { RestBar } from '@/components/features/workout/rest-bar'
import {
  ExercisePicker,
  type PickableExercise,
} from '@/components/features/exercises/exercise-picker'
import {
  addWorkoutExercise,
  deleteSet,
  discardWorkout,
  finishWorkout,
  logSet,
} from '@/lib/db/mutations'
import { acquireWakeLock, haptic, unlockAudio } from '@/lib/feedback'
import { useRestTimer } from '@/lib/stores/rest-timer'
import { formatVolume, stepFor, unitLabel, type UnitSystem } from '@/lib/calc/units'
import { totalVolume } from '@/lib/calc/volume'
import { spring } from '@/lib/motion'
import type { FinishWorkoutResult } from '@/types/database'
import { cn } from '@/lib/utils/cn'

export type LoggedSet = {
  id: string
  set_number: number
  weight_kg: number
  reps: number
  is_warmup: boolean
}

export type LoggerExercise = {
  id: string
  name: string
  position: number
  rest_seconds: number | null
  sets: LoggedSet[]
}

export function WorkoutLogger({
  workoutId,
  workoutName,
  initialExercises,
  library,
  unit,
  defaultRestSeconds,
}: {
  workoutId: string
  workoutName: string
  initialExercises: LoggerExercise[]
  library: PickableExercise[]
  unit: UnitSystem
  defaultRestSeconds: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [exercises, setExercises] = useState(initialExercises)
  const [index, setIndex] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [summary, setSummary] = useState<FinishWorkoutResult | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)

  const current = exercises[index]
  const weightStep = stepFor(unit)

  // Draft values for the set about to be logged. Seeded from the last set of
  // this exercise, because the overwhelmingly common case is repeating it.
  const lastSet = current?.sets[current.sets.length - 1]
  const [weight, setWeight] = useState(lastSet?.weight_kg ?? 0)
  const [reps, setReps] = useState(lastSet?.reps ?? 8)
  const [isWarmup, setIsWarmup] = useState(false)

  const startRest = useRestTimer((s) => s.start)

  useEffect(() => acquireWakeLock(), [])

  // Moving to another exercise re-seeds the draft from that exercise's own
  // history. Carrying 100kg from bench over to lateral raises is worse than
  // useless — it is a number someone taps "complete" on by reflex.
  //
  // Adjusted during render rather than in an effect. As an effect it would
  // have to depend on `exercises` too, which changes on every logged set, and
  // it would then wipe whatever weight the user had just dialled in for the
  // next one.
  const [seededFor, setSeededFor] = useState(index)
  if (seededFor !== index) {
    setSeededFor(index)
    const previous = exercises[index]?.sets.at(-1)
    setWeight(previous?.weight_kg ?? 0)
    setReps(previous?.reps ?? 8)
    setIsWarmup(false)
  }

  const allSets = exercises.flatMap((e) => e.sets)
  const volume = totalVolume(allSets)

  function completeSet() {
    if (!current) return

    unlockAudio()
    haptic.medium()

    const id = crypto.randomUUID()
    const setNumber = current.sets.length + 1

    // Optimistic. The row is on screen before the request leaves, because
    // waiting on a network round trip between sets is the single most
    // noticeable lag in the whole app.
    setExercises((list) =>
      list.map((e) =>
        e.id === current.id
          ? {
              ...e,
              sets: [
                ...e.sets,
                {
                  id,
                  set_number: setNumber,
                  weight_kg: weight,
                  reps,
                  is_warmup: isWarmup,
                },
              ],
            }
          : e,
      ),
    )

    // Warm-ups do not start a rest timer — nobody rests two minutes after an
    // empty bar.
    if (!isWarmup) {
      startRest(current.rest_seconds ?? defaultRestSeconds)
    }

    startTransition(async () => {
      await logSet({
        id,
        workout_exercise_id: current.id,
        set_number: setNumber,
        weight_kg: weight,
        reps,
        is_warmup: isWarmup,
      })
    })
  }

  function removeSet(setId: string) {
    setExercises((list) =>
      list.map((e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) })),
    )
    startTransition(() => deleteSet(setId))
  }

  function addExercises(ids: string[]) {
    startTransition(async () => {
      for (const exerciseId of ids) {
        const found = library.find((e) => e.id === exerciseId)
        if (!found) continue
        const rowId = await addWorkoutExercise(workoutId, exerciseId)
        setExercises((list) => [
          ...list,
          {
            id: rowId,
            name: found.name,
            position: list.length,
            rest_seconds: null,
            sets: [],
          },
        ])
      }
    })
  }

  function finish() {
    setConfirmFinish(false)
    startTransition(async () => {
      const result = await finishWorkout(workoutId)
      setSummary(result)
    })
  }

  if (!current) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <p className="text-title-3">No exercises yet</p>
        <Button variant="primary" onClick={() => setPickerOpen(true)}>
          Add one
        </Button>
        <ExercisePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          exercises={library}
          onConfirm={addExercises}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col pb-40">
      <header className="material-thin border-separator pt-safe sticky top-0 z-20 border-b">
        <div className="flex h-11 items-center gap-2 px-2">
          <button
            onClick={() => router.push('/')}
            aria-label="Back to dashboard"
            className="text-accent flex size-11 items-center justify-center"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-headline truncate">{workoutName}</p>
            <p className="text-overline text-text-tertiary uppercase">
              {allSets.length} sets · {formatVolume(volume, unit)}
            </p>
          </div>
          <button
            onClick={() => setConfirmFinish(true)}
            className="text-accent text-subhead px-3 font-semibold"
          >
            Finish
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-5 pt-4">
        {/* Exercise pager. A row of chips rather than a swipe surface — the
            set list below already scrolls, and two competing gestures in one
            viewport is how a logger loses a rep. */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous exercise"
            className="text-text-tertiary flex size-9 items-center justify-center disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-title-2 truncate">{current.name}</h1>
            <p className="text-footnote text-text-secondary">
              Exercise {index + 1} of {exercises.length}
            </p>
          </div>
          <button
            onClick={() =>
              setIndex((i) => Math.min(exercises.length - 1, i + 1))
            }
            disabled={index >= exercises.length - 1}
            aria-label="Next exercise"
            className="text-text-tertiary flex size-9 items-center justify-center disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {current.sets.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-overline text-text-tertiary uppercase">
              Today · {current.sets.length}{' '}
              {current.sets.length === 1 ? 'set' : 'sets'}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {current.sets.map((set) => (
                <motion.li
                  key={set.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring.snappy}
                  className={cn(
                    'bg-surface flex items-center gap-3 rounded-md px-3 py-2.5 shadow-sm',
                    set.is_warmup && 'opacity-60',
                  )}
                >
                  <span className="tabular text-footnote text-text-tertiary w-5 font-mono">
                    {set.set_number}
                  </span>
                  <span className="tabular text-headline flex-1 font-mono">
                    {set.weight_kg} {unitLabel(unit)} × {set.reps}
                  </span>
                  {set.is_warmup && (
                    <span className="text-caption text-text-tertiary">
                      WARM-UP
                    </span>
                  )}
                  <Check size={16} className="text-success" />
                  <button
                    onClick={() => removeSet(set.id)}
                    aria-label={`Delete set ${set.set_number}`}
                    className="text-text-tertiary flex size-8 items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        <Card className="border-l-accent flex flex-col gap-4 border-l-4 shadow-md">
          <div className="flex gap-3">
            <Stepper
              label={`Weight (${unitLabel(unit)})`}
              value={weight}
              step={weightStep}
              decimals={weightStep % 1 === 0 ? 0 : 1}
              onChange={setWeight}
              className="flex-1"
            />
            <Stepper
              label="Reps"
              value={reps}
              max={100}
              onChange={setReps}
              className="flex-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsWarmup((w) => !w)}
              className={cn(
                'text-caption rounded-full px-3 py-1.5 font-semibold transition-colors',
                isWarmup
                  ? 'bg-accent-soft text-accent'
                  : 'bg-sunken text-text-secondary',
              )}
            >
              Warm-up
            </button>
            <span className="text-footnote text-text-tertiary">
              {lastSet
                ? `Last: ${lastSet.weight_kg} ${unitLabel(unit)} × ${lastSet.reps}`
                : 'First set'}
            </span>
          </div>

          <Button variant="primary" size="lg" fullWidth onClick={completeSet}>
            <Check size={20} /> Complete set
          </Button>
        </Card>

        <Button variant="ghost" fullWidth onClick={() => setPickerOpen(true)}>
          <Plus size={18} /> Add exercise
        </Button>
      </div>

      <RestBar />

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={library}
        onConfirm={addExercises}
      />

      <Sheet
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="Finish workout?"
        description={`${allSets.length} sets · ${formatVolume(volume, unit)}`}
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            fullWidth
            disabled={pending}
            onClick={finish}
          >
            Finish
          </Button>
          <Button
            variant="destructive"
            fullWidth
            onClick={() => {
              setConfirmFinish(false)
              startTransition(async () => {
                await discardWorkout(workoutId)
                router.push('/')
              })
            }}
          >
            Discard this workout
          </Button>
        </div>
      </Sheet>

      <SummarySheet
        summary={summary}
        unit={unit}
        onClose={() => {
          setSummary(null)
          router.push('/')
        }}
      />
    </div>
  )
}

function SummarySheet({
  summary,
  unit,
  onClose,
}: {
  summary: FinishWorkoutResult | null
  unit: UnitSystem
  onClose: () => void
}) {
  const prs = summary?.new_prs ?? []
  const badges = summary?.new_badges ?? []
  const improvements = prs.filter((pr) => pr.previous_value !== null)

  return (
    <Sheet
      open={summary !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Workout complete"
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sunken rounded-lg p-4">
            <p className="text-overline text-text-tertiary uppercase">Volume</p>
            <p className="tabular text-title-1 font-mono font-semibold">
              {formatVolume(Number(summary?.summary?.total_volume_kg ?? 0), unit)}
            </p>
          </div>
          <div className="bg-sunken rounded-lg p-4">
            <p className="text-overline text-text-tertiary uppercase">Sets</p>
            <p className="tabular text-title-1 font-mono font-semibold">
              {summary?.summary?.total_sets ?? 0}
            </p>
          </div>
        </div>

        {improvements.length > 0 && (
          <div className="bg-accent-soft rounded-lg p-4">
            <p className="text-headline text-accent">
              {improvements.length} personal{' '}
              {improvements.length === 1 ? 'record' : 'records'}
            </p>
          </div>
        )}

        {badges.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-overline text-text-tertiary uppercase">
              Unlocked
            </p>
            {badges.map((badge) => (
              <motion.div
                key={badge.achievement_id}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring.bouncy}
                className="bg-surface rounded-lg px-4 py-3 shadow-sm"
              >
                <p className="text-headline">{badge.name}</p>
                <p className="text-footnote text-text-secondary capitalize">
                  {badge.category}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        <Button variant="primary" size="lg" fullWidth onClick={onClose}>
          Done
        </Button>
      </div>
    </Sheet>
  )
}
