/**
 * Achievement definitions — 24 badges across three categories.
 *
 * Mirrored into the `achievements` table by the seed generator. The table is
 * what `evaluate_achievements()` reads; this file is what the UI renders, so
 * the badge grid works offline and before the first sync.
 *
 * No icons here or in the database. Badge artwork is a design-system concern,
 * keyed by badge id in the component layer — an emoji stored in Postgres is a
 * placeholder that needs a migration to replace.
 *
 * Every badge is a threshold on one of five metrics. That constraint is
 * deliberate: a badge whose unlock rule needs bespoke SQL is a badge that
 * silently stops working the first time the schema changes.
 */

export type BadgeCategory = 'milestones' | 'volume' | 'strength'

export type BadgeMetric =
  | 'workouts_count'
  | 'total_volume_kg'
  | 'streak_days'
  | 'sets_count'
  | 'pr_count'

export type Badge = {
  id: string
  category: BadgeCategory
  name: string
  description: string
  metric: BadgeMetric
  threshold: number
  sortOrder: number
}

export const BADGES: readonly Badge[] = [
  // ----------------------------------------------------------- milestones
  { id: 'first_rep', category: 'milestones', name: 'First Rep', description: 'Finish your first workout.', metric: 'workouts_count', threshold: 1, sortOrder: 1 },
  { id: 'getting_serious', category: 'milestones', name: 'Getting Serious', description: 'Finish 5 workouts.', metric: 'workouts_count', threshold: 5, sortOrder: 2 },
  { id: 'gym_regular', category: 'milestones', name: 'Gym Regular', description: 'Finish 25 workouts.', metric: 'workouts_count', threshold: 25, sortOrder: 3 },
  { id: 'century_club', category: 'milestones', name: 'Century Club', description: 'Finish 100 workouts.', metric: 'workouts_count', threshold: 100, sortOrder: 4 },
  { id: 'iron_veteran', category: 'milestones', name: 'Iron Veteran', description: 'Finish 250 workouts.', metric: 'workouts_count', threshold: 250, sortOrder: 5 },
  { id: 'week_warrior', category: 'milestones', name: 'Week Warrior', description: 'Train 7 days in a row.', metric: 'streak_days', threshold: 7, sortOrder: 6 },
  { id: 'month_strong', category: 'milestones', name: 'Month Strong', description: 'Hold a 30-day streak.', metric: 'streak_days', threshold: 30, sortOrder: 7 },
  { id: 'unbreakable', category: 'milestones', name: 'Unbreakable', description: 'Hold a 100-day streak.', metric: 'streak_days', threshold: 100, sortOrder: 8 },

  // --------------------------------------------------------------- volume
  { id: 'set_stacker', category: 'volume', name: 'Set Stacker', description: 'Log 100 working sets.', metric: 'sets_count', threshold: 100, sortOrder: 1 },
  { id: 'set_legend', category: 'volume', name: 'Set Legend', description: 'Log 500 working sets.', metric: 'sets_count', threshold: 500, sortOrder: 2 },
  { id: 'rep_machine', category: 'volume', name: 'Rep Machine', description: 'Log 2,000 working sets.', metric: 'sets_count', threshold: 2000, sortOrder: 3 },
  { id: 'set_immortal', category: 'volume', name: 'Set Immortal', description: 'Log 5,000 working sets.', metric: 'sets_count', threshold: 5000, sortOrder: 4 },
  { id: 'volume_machine', category: 'volume', name: 'Volume Machine', description: 'Move 10,000 kg in total.', metric: 'total_volume_kg', threshold: 10000, sortOrder: 5 },
  { id: 'ton_lifter', category: 'volume', name: 'Ton Lifter', description: 'Move 50,000 kg in total.', metric: 'total_volume_kg', threshold: 50000, sortOrder: 6 },
  { id: 'heavy_hauler', category: 'volume', name: 'Heavy Hauler', description: 'Move 250,000 kg in total.', metric: 'total_volume_kg', threshold: 250000, sortOrder: 7 },
  { id: 'mountain_mover', category: 'volume', name: 'Mountain Mover', description: 'Move 1,000,000 kg in total.', metric: 'total_volume_kg', threshold: 1000000, sortOrder: 8 },

  // ------------------------------------------------------------- strength
  { id: 'record_breaker', category: 'strength', name: 'Record Breaker', description: 'Set your first personal record.', metric: 'pr_count', threshold: 1, sortOrder: 1 },
  { id: 'pr_hunter', category: 'strength', name: 'PR Hunter', description: 'Set 5 personal records.', metric: 'pr_count', threshold: 5, sortOrder: 2 },
  { id: 'record_machine', category: 'strength', name: 'Record Machine', description: 'Set 15 personal records.', metric: 'pr_count', threshold: 15, sortOrder: 3 },
  { id: 'pr_collector', category: 'strength', name: 'PR Collector', description: 'Set 30 personal records.', metric: 'pr_count', threshold: 30, sortOrder: 4 },
  { id: 'relentless', category: 'strength', name: 'Relentless', description: 'Set 60 personal records.', metric: 'pr_count', threshold: 60, sortOrder: 5 },
  { id: 'pr_addict', category: 'strength', name: 'PR Addict', description: 'Set 100 personal records.', metric: 'pr_count', threshold: 100, sortOrder: 6 },
  { id: 'iron_will', category: 'strength', name: 'Iron Will', description: 'Set 200 personal records.', metric: 'pr_count', threshold: 200, sortOrder: 7 },
  { id: 'immortal', category: 'strength', name: 'Immortal', description: 'Set 500 personal records.', metric: 'pr_count', threshold: 500, sortOrder: 8 },
] as const

export const BADGE_CATEGORIES = [
  { id: 'milestones', label: 'Milestones' },
  { id: 'volume', label: 'Volume' },
  { id: 'strength', label: 'Strength' },
] as const satisfies readonly { id: BadgeCategory; label: string }[]

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]))
