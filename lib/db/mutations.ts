'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { FinishWorkoutResult } from '@/types/database'

/**
 * Server Actions — every write in the app.
 *
 * Two rules hold throughout:
 *
 *  1. Input is validated with zod here, on the server. Client-side validation
 *     is a UX affordance; this is the control. A Server Action is a public
 *     HTTP endpoint whether or not the UI ever calls it that way.
 *
 *  2. Nothing writes personal_records or user_achievements. Those tables have
 *     no insert policy at all — only the security definer functions touch
 *     them, which is what makes a PR mean something.
 */

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not signed in')
  return { supabase, user }
}

// ------------------------------------------------------------------ profile

const profileSchema = z.object({
  display_name: z.string().trim().max(60).nullish(),
  unit_system: z.enum(['metric', 'imperial']).optional(),
  default_rest_seconds: z.number().int().min(0).max(900).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  week_starts_on: z.number().int().min(0).max(6).optional(),
  timezone: z.string().max(64).optional(),
})

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const { supabase, user } = await requireUser()
  const values = profileSchema.parse(input)

  const { error } = await supabase
    .from('profiles')
    .update(values)
    .eq('id', user.id)

  if (error) throw error
  revalidatePath('/', 'layout')
}

export async function completeOnboarding() {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('profiles')
    .update({
      onboarded: true,
      // Captured once, at the only moment the browser is guaranteed to be the
      // user's own device. Streaks are wrong in a way nobody can debug if this
      // is left at UTC for someone in Jakarta.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
    .eq('id', user.id)

  if (error) throw error
  revalidatePath('/', 'layout')
}

// ----------------------------------------------------------------- exercises

const customExerciseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  equipment: z.enum([
    'barbell',
    'dumbbell',
    'machine',
    'cable',
    'bodyweight',
    'kettlebell',
    'band',
    'other',
  ]),
  type: z.enum(['strength', 'cardio', 'mobility']).default('strength'),
  is_unilateral: z.boolean().default(false),
  default_rest_seconds: z.number().int().min(0).max(900).nullish(),
  muscles: z
    .array(
      z.object({
        muscle_group_id: z.string(),
        activation: z.number().min(0).max(1),
      }),
    )
    .min(1, 'Pick at least one muscle group'),
})

export async function createCustomExercise(
  input: z.infer<typeof customExerciseSchema>,
) {
  const { supabase, user } = await requireUser()
  const parsed = customExerciseSchema.parse(input)

  const { data: exercise, error } = await supabase
    .from('exercises')
    .insert({
      user_id: user.id,
      name: parsed.name,
      equipment: parsed.equipment,
      type: parsed.type,
      is_unilateral: parsed.is_unilateral,
      default_rest_seconds: parsed.default_rest_seconds ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  const { error: mapError } = await supabase.from('exercise_muscles').insert(
    parsed.muscles.map((m) => ({
      exercise_id: exercise.id,
      muscle_group_id: m.muscle_group_id,
      role: m.activation >= 0.7 ? ('primary' as const) : ('secondary' as const),
      activation: m.activation,
    })),
  )

  if (mapError) throw mapError

  revalidatePath('/exercises/add')
  return exercise.id
}

// ------------------------------------------------------------------ routines

const routineStructureSchema = z.object({
  name: z.string().trim().min(1).max(80),
  exercises: z
    .array(
      z.object({
        exercise_id: z.uuid(),
        rest_seconds: z.number().int().min(0).max(900).nullish(),
        superset_with_next: z.boolean().default(false),
        notes: z.string().max(500).nullish(),
        sets: z
          .array(
            z.object({
              target_weight_kg: z.number().min(0).max(1000).nullish(),
              target_reps: z.number().int().min(0).max(1000).nullish(),
              is_warmup: z.boolean().default(false),
            }),
          )
          .max(30),
      }),
    )
    .max(40),
})

export async function createRoutine(
  input: z.infer<typeof routineStructureSchema>,
) {
  const { supabase, user } = await requireUser()
  const parsed = routineStructureSchema.parse(input)

  const { data: routine, error } = await supabase
    .from('routines')
    .insert({ user_id: user.id, name: parsed.name })
    .select('id')
    .single()

  if (error) throw error

  await writeVersion(supabase, routine.id, 1, parsed)

  revalidatePath('/')
  return routine.id
}

/**
 * Saves a routine's structure.
 *
 * `asNewVersion` branches instead of mutating, so a workout logged last month
 * keeps pointing at the structure it was actually performed with. The caller
 * decides: the editor only offers the choice once a routine has history, since
 * versioning an untouched routine is a concept nobody asked for.
 */
export async function saveRoutineVersion(
  routineId: string,
  input: z.infer<typeof routineStructureSchema>,
  asNewVersion = false,
) {
  const { supabase } = await requireUser()
  const parsed = routineStructureSchema.parse(input)

  const { data: current, error: currentError } = await supabase
    .from('routine_versions')
    .select('id, version')
    .eq('routine_id', routineId)
    .eq('is_current', true)
    .maybeSingle()

  if (currentError) throw currentError

  await supabase
    .from('routines')
    .update({ name: parsed.name })
    .eq('id', routineId)

  if (asNewVersion && current) {
    await supabase
      .from('routine_versions')
      .update({ is_current: false })
      .eq('id', current.id)

    await writeVersion(supabase, routineId, current.version + 1, parsed)
  } else if (current) {
    // Replace the version's contents in place. Cascade deletes take the sets
    // with the exercises, so this cannot leave orphans behind.
    await supabase
      .from('routine_exercises')
      .delete()
      .eq('routine_version_id', current.id)

    await writeExercises(supabase, current.id, parsed)
  } else {
    await writeVersion(supabase, routineId, 1, parsed)
  }

  revalidatePath('/')
  revalidatePath(`/routines/${routineId}/edit`)
}

export async function archiveRoutine(routineId: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from('routines')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', routineId)

  if (error) throw error
  revalidatePath('/')
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function writeVersion(
  supabase: SupabaseClient,
  routineId: string,
  version: number,
  parsed: z.infer<typeof routineStructureSchema>,
) {
  const { data: created, error } = await supabase
    .from('routine_versions')
    .insert({ routine_id: routineId, version, is_current: true })
    .select('id')
    .single()

  if (error) throw error
  await writeExercises(supabase, created.id, parsed)
}

async function writeExercises(
  supabase: SupabaseClient,
  versionId: string,
  parsed: z.infer<typeof routineStructureSchema>,
) {
  for (const [index, exercise] of parsed.exercises.entries()) {
    const { data: row, error } = await supabase
      .from('routine_exercises')
      .insert({
        routine_version_id: versionId,
        exercise_id: exercise.exercise_id,
        position: index,
        rest_seconds: exercise.rest_seconds ?? null,
        superset_with_next: exercise.superset_with_next,
        notes: exercise.notes ?? null,
      })
      .select('id')
      .single()

    if (error) throw error
    if (exercise.sets.length === 0) continue

    const { error: setsError } = await supabase.from('routine_sets').insert(
      exercise.sets.map((set, i) => ({
        routine_exercise_id: row.id,
        set_number: i + 1,
        target_weight_kg: set.target_weight_kg ?? null,
        target_reps: set.target_reps ?? null,
        is_warmup: set.is_warmup,
      })),
    )

    if (setsError) throw setsError
  }
}

// ------------------------------------------------------------------ workouts

/**
 * Workout and set IDs are generated by the caller when one is offered.
 *
 * A session that starts in a basement needs a stable identity before the
 * server hears about it, or the offline queue has nothing to reference and
 * a replayed write becomes a duplicate rather than an idempotent retry.
 */
export async function startWorkout(input: {
  id?: string
  routineId?: string
  name?: string
}) {
  const { supabase, user } = await requireUser()
  const workoutId = input.id ?? randomUUID()

  let routineVersionId: string | null = null
  let name = input.name ?? 'Workout'

  if (input.routineId) {
    const { data: version } = await supabase
      .from('routine_versions')
      .select('id, routine:routines(name)')
      .eq('routine_id', input.routineId)
      .eq('is_current', true)
      .maybeSingle()

    if (version) {
      routineVersionId = version.id
      // Snapshot the name. Renaming a routine later must not rewrite what
      // last week's session was called.
      const routine = version.routine as { name: string } | null
      if (routine?.name) name = routine.name
    }
  }

  const { error } = await supabase.from('workouts').insert({
    id: workoutId,
    user_id: user.id,
    routine_version_id: routineVersionId,
    name,
  })

  if (error) throw error

  if (routineVersionId) {
    await seedWorkoutFromRoutine(supabase, workoutId, routineVersionId)
  }

  revalidatePath('/')
  return workoutId
}

async function seedWorkoutFromRoutine(
  supabase: SupabaseClient,
  workoutId: string,
  routineVersionId: string,
) {
  const { data: planned } = await supabase
    .from('routine_exercises')
    .select('exercise_id, position, rest_seconds')
    .eq('routine_version_id', routineVersionId)
    .order('position')

  if (!planned?.length) return

  await supabase.from('workout_exercises').insert(
    planned.map((row, index) => ({
      workout_id: workoutId,
      exercise_id: row.exercise_id,
      position: index,
      rest_seconds: row.rest_seconds,
    })),
  )
}

export async function addWorkoutExercise(
  workoutId: string,
  exerciseId: string,
) {
  const { supabase } = await requireUser()

  const { count } = await supabase
    .from('workout_exercises')
    .select('id', { count: 'exact', head: true })
    .eq('workout_id', workoutId)

  const { data, error } = await supabase
    .from('workout_exercises')
    .insert({
      workout_id: workoutId,
      exercise_id: exerciseId,
      position: count ?? 0,
    })
    .select('id')
    .single()

  if (error) throw error
  revalidatePath(`/workout/${workoutId}`)
  return data.id
}

const logSetSchema = z.object({
  id: z.uuid().optional(),
  workout_exercise_id: z.uuid(),
  set_number: z.number().int().min(1).max(100),
  weight_kg: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(1000),
  is_warmup: z.boolean().default(false),
  rpe: z.number().min(1).max(10).nullish(),
})

export async function logSet(input: z.infer<typeof logSetSchema>) {
  const { supabase } = await requireUser()
  const parsed = logSetSchema.parse(input)
  const id = parsed.id ?? randomUUID()

  // Upsert, not insert. The offline queue replays writes it is not certain
  // landed, and a retry must correct the row rather than create a second one.
  const { error } = await supabase.from('sets').upsert(
    {
      id,
      workout_exercise_id: parsed.workout_exercise_id,
      set_number: parsed.set_number,
      weight_kg: parsed.weight_kg,
      reps: parsed.reps,
      is_warmup: parsed.is_warmup,
      rpe: parsed.rpe ?? null,
    },
    { onConflict: 'id' },
  )

  if (error) throw error
  return id
}

export async function deleteSet(setId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('sets').delete().eq('id', setId)
  if (error) throw error
}

/**
 * Ends the session. One RPC rather than three writes: end stamp, PR
 * detection, and badge evaluation happen in a single transaction, so a
 * connection that drops mid-call cannot leave a finished workout that never
 * awarded anything.
 */
export async function finishWorkout(
  workoutId: string,
): Promise<FinishWorkoutResult> {
  const { supabase } = await requireUser()

  const { data, error } = await supabase.rpc('finish_workout', {
    p_workout_id: workoutId,
  })

  if (error) throw error

  revalidatePath('/')
  revalidatePath('/history')
  revalidatePath('/insights')
  revalidatePath('/achievements')

  return data as unknown as FinishWorkoutResult
}

export async function discardWorkout(workoutId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
  if (error) throw error
  revalidatePath('/')
}
