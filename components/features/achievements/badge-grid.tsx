'use client'

import { useState, useTransition } from 'react'
import { Lock, RefreshCw } from 'lucide-react'
import { motion } from 'motion/react'

import { Card } from '@/components/ui/card'
import { Chip, ChipRow } from '@/components/ui/chip'
import { Sheet } from '@/components/ui/sheet'
import { BadgeGlyph } from '@/components/features/achievements/badge-icon'
import { BADGE_CATEGORIES } from '@/data/badges.config'
import { refreshAchievements } from '@/lib/db/mutations'
import { formatVolume, type UnitSystem } from '@/lib/calc/units'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'

export type BadgeRow = {
  id: string
  category: string
  name: string
  description: string
  metric: string
  threshold: number
  progress: number
  unlockedAt: string | null
}

export function BadgeGrid({
  badges,
  unit,
}: {
  badges: BadgeRow[]
  unit: UnitSystem
}) {
  const [filter, setFilter] = useState<string>('all')
  const [detail, setDetail] = useState<BadgeRow | null>(null)
  const [pending, startTransition] = useTransition()

  const unlocked = badges.filter((b) => b.unlockedAt).length
  const percent = badges.length ? Math.round((unlocked / badges.length) * 100) : 0

  const visible =
    filter === 'all' ? badges : badges.filter((b) => b.category === filter)

  const grouped = BADGE_CATEGORIES.map((category) => ({
    ...category,
    items: visible.filter((b) => b.category === category.id),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex flex-col gap-5 px-5 py-4">
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="tabular text-title-1 font-mono font-semibold">
            {percent}%
          </span>
          <span className="text-subhead text-text-secondary">
            {unlocked} of {badges.length} unlocked
          </span>
        </div>
        <div className="bg-sunken h-2 overflow-hidden rounded-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={spring.smooth}
            className="bg-accent h-full rounded-full"
          />
        </div>
        <p className="text-footnote text-text-secondary">
          {unlocked === badges.length
            ? 'Every badge earned.'
            : 'Keep training to earn more.'}
        </p>
      </Card>

      <ChipRow>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </Chip>
        {BADGE_CATEGORIES.map((category) => (
          <Chip
            key={category.id}
            active={filter === category.id}
            onClick={() => setFilter(category.id)}
          >
            {category.label}
          </Chip>
        ))}
      </ChipRow>

      {grouped.map((group) => (
        <section key={group.id} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-overline text-text-tertiary uppercase">
              {group.label}
            </h2>
            <span className="text-caption text-text-tertiary tabular">
              {group.items.filter((b) => b.unlockedAt).length}/
              {group.items.length}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {group.items.map((badge) => (
              <BadgeTile
                key={badge.id}
                badge={badge}
                unit={unit}
                onClick={() => setDetail(badge)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Every finished workout re-evaluates everything, so this is only for
          impatience — or for a user who imported history and does not want to
          wait until their next session to see it counted. */}
      <button
        onClick={() => startTransition(() => refreshAchievements())}
        disabled={pending}
        className="text-text-tertiary text-footnote flex items-center justify-center gap-1.5 py-2"
      >
        <RefreshCw size={13} className={pending ? 'animate-spin' : undefined} />
        {pending ? 'Recalculating…' : 'Recalculate from history'}
      </button>

      <BadgeDetail
        badge={detail}
        unit={unit}
        onClose={() => setDetail(null)}
      />
    </div>
  )
}

function BadgeTile({
  badge,
  unit,
  onClick,
}: {
  badge: BadgeRow
  unit: UnitSystem
  onClick: () => void
}) {
  const isUnlocked = badge.unlockedAt !== null

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={spring.snappy}
      onClick={onClick}
      className={cn(
        'bg-surface relative flex aspect-square flex-col items-center justify-center gap-1.5',
        'rounded-lg p-2 shadow-sm',
        isUnlocked
          ? 'border-accent/30 border bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface)]'
          : 'opacity-45 grayscale',
      )}
    >
      <BadgeGlyph
        id={badge.id}
        className={isUnlocked ? 'text-accent' : 'text-text-tertiary'}
      />
      <span className="text-caption text-center leading-tight">
        {badge.name}
      </span>
      <span className="text-[10px] text-text-tertiary tabular font-mono">
        {formatProgress(badge, unit)}
      </span>

      {!isUnlocked && (
        <Lock size={10} className="text-text-tertiary absolute right-1.5 bottom-1.5" />
      )}
    </motion.button>
  )
}

function BadgeDetail({
  badge,
  unit,
  onClose,
}: {
  badge: BadgeRow | null
  unit: UnitSystem
  onClose: () => void
}) {
  const ratio = badge
    ? Math.min(1, badge.threshold > 0 ? badge.progress / badge.threshold : 0)
    : 0

  return (
    <Sheet
      open={badge !== null}
      onOpenChange={(open) => !open && onClose()}
      title={badge?.name ?? ''}
      description={badge?.description}
    >
      {badge && (
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex size-20 items-center justify-center rounded-2xl',
              badge.unlockedAt
                ? 'bg-accent-soft text-accent'
                : 'bg-sunken text-text-tertiary',
            )}
          >
            <BadgeGlyph id={badge.id} size={38} strokeWidth={1.5} />
          </div>

          <div className="w-full">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-footnote text-text-secondary">
                Progress
              </span>
              <span className="tabular text-footnote font-mono">
                {formatProgress(badge, unit)}
              </span>
            </div>
            <div className="bg-sunken h-2 overflow-hidden rounded-full">
              <div
                className="bg-accent h-full rounded-full"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>

          {badge.unlockedAt ? (
            <p className="text-footnote text-text-secondary">
              Earned{' '}
              {new Date(badge.unlockedAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          ) : (
            <p className="text-footnote text-text-tertiary">
              {describeRemaining(badge, unit)}
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}

/**
 * Volume thresholds run to seven figures, so they get the compact formatter.
 * Everything else is a plain count and reads better unabbreviated.
 */
function formatProgress(badge: BadgeRow, unit: UnitSystem): string {
  if (badge.metric === 'total_volume_kg') {
    return `${formatVolume(badge.progress, unit)} / ${formatVolume(badge.threshold, unit)}`
  }
  return `${Math.floor(badge.progress).toLocaleString('en-US')} / ${badge.threshold.toLocaleString('en-US')}`
}

function describeRemaining(badge: BadgeRow, unit: UnitSystem): string {
  const remaining = Math.max(0, badge.threshold - badge.progress)

  switch (badge.metric) {
    case 'workouts_count':
      return `${Math.ceil(remaining)} more ${remaining === 1 ? 'workout' : 'workouts'} to go.`
    case 'sets_count':
      return `${Math.ceil(remaining).toLocaleString('en-US')} more sets to go.`
    case 'streak_days':
      return `${Math.ceil(remaining)} more consecutive ${remaining === 1 ? 'day' : 'days'}.`
    case 'pr_count':
      return `${Math.ceil(remaining)} more personal ${remaining === 1 ? 'record' : 'records'}.`
    case 'total_volume_kg':
      return `${formatVolume(remaining, unit)} left to move.`
    default:
      return 'Keep training.'
  }
}
