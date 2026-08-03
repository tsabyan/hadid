import Link from 'next/link'
import { Plus, Settings } from 'lucide-react'

import { QuickStats } from '@/components/features/dashboard/quick-stats'
import { SyncIndicator } from '@/components/shell/sync-indicator'
import { RoutineList } from '@/components/features/dashboard/routine-list'

import { Card } from '@/components/ui/card'
import { getDashboardStats, getProfile, listRoutines, getActiveWorkout } from '@/lib/db/queries'

export default async function DashboardPage() {
  const [profile, stats, routines, active] = await Promise.all([
    getProfile(),
    getDashboardStats(),
    listRoutines(),
    getActiveWorkout(),
  ])

  const unit = profile?.unit_system ?? 'metric'

  return (
    <main className="flex flex-col gap-6 px-5 pt-safe">
      <header className="flex items-start justify-between pt-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-title-1">{greeting()}</h1>
            <SyncIndicator />
          </div>
          <p className="text-subhead text-text-secondary">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="text-text-tertiary flex size-11 items-center justify-center"
        >
          <Settings size={20} />
        </Link>
      </header>

      <QuickStats
        streak={stats.streak}
        weekVolumeKg={stats.weekVolumeKg}
        previousWeekVolumeKg={stats.previousWeekVolumeKg}
        lastWorkout={stats.lastWorkout}
        unit={unit}
      />

      {/* An abandoned session is the single most confusing state in the app —
          the tab bar looks normal while a workout quietly stays open. Surface
          it before anything else. */}
      {active && (
        <Card className="border-accent/30 flex items-center gap-3 border">
          <div className="min-w-0 flex-1">
            <p className="text-overline text-accent uppercase">In progress</p>
            <h2 className="text-title-3 truncate">{active.name}</h2>
            <p className="text-footnote text-text-secondary">
              {active.total_sets} sets logged
            </p>
          </div>
          {/* A Link, not a Button wrapping one — an anchor inside a button is
              invalid markup and breaks keyboard activation. */}
          <Link
            href={`/workout/${active.id}`}
            className="bg-accent text-accent-text text-callout flex h-11 shrink-0 items-center rounded-md px-4 font-semibold"
          >
            Resume
          </Link>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-overline text-text-tertiary uppercase">
            Routines
          </h2>
          <Link
            href="/routines/new"
            className="text-accent text-subhead flex items-center gap-1 font-semibold"
          >
            <Plus size={16} /> New
          </Link>
        </div>

        <RoutineList routines={routines} />
      </section>
    </main>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
