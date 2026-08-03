import { Header } from '@/components/shell/header'
import { HistoryCalendar } from '@/components/features/history/calendar'
import {
  getDailyVolume,
  getMuscleLoad,
  getProfile,
  listWorkoutsInRange,
} from '@/lib/db/queries'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams

  const anchor = month ? new Date(`${month}T00:00:00`) : new Date()
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59)

  const [profile, volume, workouts, muscles] = await Promise.all([
    getProfile(),
    getDailyVolume(from, to),
    listWorkoutsInRange(from, to),
    getMuscleLoad(from, to),
  ])

  return (
    <>
      <Header title="History" />
      <HistoryCalendar
        month={`${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`}
        days={volume
          .filter((row) => row.day)
          .map((row) => ({
            day: row.day as string,
            volume: Number(row.volume_kg ?? 0),
            sets: Number(row.set_count ?? 0),
            workouts: Number(row.workout_count ?? 0),
          }))}
        workouts={workouts
          .filter((row) => row.workout_id && row.started_at)
          .map((row) => ({
            workout_id: row.workout_id as string,
            name: row.name ?? 'Workout',
            started_at: row.started_at as string,
            duration_seconds: row.duration_seconds,
            total_volume_kg: Number(row.total_volume_kg ?? 0),
            total_sets: Number(row.total_sets ?? 0),
          }))}
        muscles={muscles
          .filter((row) => row.day && row.muscle_group_id)
          .map((row) => ({
            day: row.day as string,
            muscle_group_id: row.muscle_group_id as string,
            load: Number(row.load_kg ?? 0),
          }))}
        weekStartsOn={profile?.week_starts_on ?? 1}
        unit={profile?.unit_system ?? 'metric'}
      />
    </>
  )
}
