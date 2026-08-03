import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { toIsoDate } from '@/lib/calc/volume'
import { currentStreak } from '@/lib/calc/streaks'
import type { Tables, Views } from '@/types/database'

/**
 * Typed reads for Server Components.
 *
 * No function here filters by user_id. RLS already scopes every row to
 * auth.uid(), and duplicating the check in application code creates two places
 * for the rule to live — one of which will eventually be wrong. The only
 * exception is the views, where user_id is selected for grouping, not
 * filtering.
 */

export async function getProfile(): Promise<Tables<'profiles'> | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').maybeSingle()
  return data
}

export async function listExercises() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select('*, exercise_muscles(muscle_group_id, role, activation)')
    .order('name')

  if (error) throw error
  return data ?? []
}

export type RoutineListItem = Tables<'routines'> & {
  routine_versions: {
    id: string
    version: number
    is_current: boolean
    routine_exercises: { id: string }[]
  }[]
}

export async function listRoutines(): Promise<RoutineListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('routines')
    .select(
      `*, routine_versions!inner(id, version, is_current,
         routine_exercises(id))`,
    )
    .is('archived_at', null)
    .eq('routine_versions.is_current', true)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as RoutineListItem[]
}

/** Full routine tree for the editor and for starting a workout. */
export async function getCurrentRoutineVersion(routineId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('routine_versions')
    .select(
      `id, version, routine_id,
       routine:routines(name),
       routine_exercises(
         id, position, rest_seconds, superset_with_next, notes,
         exercise:exercises(id, name, slug, equipment, type, is_unilateral),
         routine_sets(id, set_number, target_weight_kg, target_reps, is_warmup)
       )`,
    )
    .eq('routine_id', routineId)
    .eq('is_current', true)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Whether any workout has been logged against this routine.
 *
 * Decides if the editor offers "new version" at all. Head-only count, so it
 * costs an index probe rather than shipping rows the page will never render.
 */
export async function routineHasHistory(routineId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: versions } = await supabase
    .from('routine_versions')
    .select('id')
    .eq('routine_id', routineId)

  const ids = (versions ?? []).map((v) => v.id)
  if (ids.length === 0) return false

  const { count } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .in('routine_version_id', ids)
    .not('ended_at', 'is', null)

  return (count ?? 0) > 0
}

export async function getActiveWorkout() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `*, workout_exercises(
         id, position, rest_seconds, notes,
         exercise:exercises(id, name, slug, equipment, type),
         sets(id, set_number, weight_kg, reps, is_warmup, rpe, volume_kg, completed_at)
       )`,
    )
    .is('ended_at', null)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getWorkout(workoutId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `*, workout_exercises(
         id, position, rest_seconds, notes,
         exercise:exercises(id, name, slug, equipment, type),
         sets(id, set_number, weight_kg, reps, is_warmup, rpe, volume_kg, completed_at)
       )`,
    )
    .eq('id', workoutId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getDailyVolume(from: Date, to: Date) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_daily_volume')
    .select('*')
    .gte('day', toIsoDate(from))
    .lte('day', toIsoDate(to))
    .order('day')

  if (error) throw error
  return (data ?? []) as Views<'v_daily_volume'>[]
}

export async function getMuscleLoad(from: Date, to: Date) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_muscle_load')
    .select('*')
    .gte('day', toIsoDate(from))
    .lte('day', toIsoDate(to))

  if (error) throw error
  return (data ?? []) as Views<'v_muscle_load'>[]
}

/**
 * Everything the dashboard's stat row needs, in two round trips rather than
 * five. The row is above the fold on the first screen of every session, so it
 * is the one query path worth hand-tuning.
 */
export async function getDashboardStats() {
  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - 400)

  const [daysResult, lastResult] = await Promise.all([
    supabase
      .from('v_daily_volume')
      .select('day, volume_kg, set_count')
      .gte('day', toIsoDate(since))
      .order('day'),
    supabase
      .from('workouts')
      .select('id, name, started_at, total_volume_kg, total_sets')
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const days = daysResult.data ?? []

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  const weekFrom = toIsoDate(weekStart)

  const prevStart = new Date()
  prevStart.setDate(prevStart.getDate() - 13)
  const prevFrom = toIsoDate(prevStart)

  const sumFrom = (from: string, to: string) =>
    days
      .filter((d) => d.day && d.day >= from && d.day <= to)
      .reduce((sum, d) => sum + Number(d.volume_kg ?? 0), 0)

  const previousWeekEnd = new Date()
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 7)

  return {
    streak: currentStreak(
      days.filter((d) => d.day).map((d) => d.day as string),
    ),
    weekVolumeKg: sumFrom(weekFrom, toIsoDate(new Date())),
    previousWeekVolumeKg: sumFrom(prevFrom, toIsoDate(previousWeekEnd)),
    lastWorkout: lastResult.data,
    trainingDays: days.length,
  }
}

export async function listRecentPrs(limit = 20) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('personal_records')
    .select('*, exercise:exercises(id, name, slug)')
    .order('achieved_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

/**
 * Badge definitions left-joined with this user's progress.
 *
 * Two queries and a merge rather than one join, because `achievements` is
 * public reference data and `user_achievements` is private — PostgREST cannot
 * left-join across that boundary and return rows for badges the user has never
 * touched, which is exactly the set the locked grid needs.
 */
export async function listAchievements() {
  const supabase = await createClient()

  const [defs, progress] = await Promise.all([
    supabase.from('achievements').select('*').order('sort_order'),
    supabase.from('user_achievements').select('*'),
  ])

  if (defs.error) throw defs.error

  const byId = new Map((progress.data ?? []).map((p) => [p.achievement_id, p]))

  return (defs.data ?? []).map((badge) => ({
    ...badge,
    progress: Number(byId.get(badge.id)?.progress ?? 0),
    unlockedAt: byId.get(badge.id)?.unlocked_at ?? null,
  }))
}

export async function listWorkoutsInRange(from: Date, to: Date) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_workout_summary')
    .select('*')
    .gte('started_at', from.toISOString())
    .lte('started_at', to.toISOString())
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Views<'v_workout_summary'>[]
}
