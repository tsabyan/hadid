import { Header } from '@/components/shell/header'
import { BadgeGrid } from '@/components/features/achievements/badge-grid'
import { getProfile, listAchievements } from '@/lib/db/queries'

export default async function AchievementsPage() {
  const [badges, profile] = await Promise.all([
    listAchievements(),
    getProfile(),
  ])

  return (
    <>
      <Header title="Achievements" />
      <BadgeGrid
        unit={profile?.unit_system ?? 'metric'}
        badges={badges.map((badge) => ({
          id: badge.id,
          category: badge.category,
          name: badge.name,
          description: badge.description,
          metric: badge.metric,
          threshold: Number(badge.threshold),
          progress: badge.progress,
          unlockedAt: badge.unlockedAt,
        }))}
      />
    </>
  )
}
