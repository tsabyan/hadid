import { createElement } from 'react'
import {
  Award,
  CalendarCheck,
  CalendarDays,
  Crown,
  Dumbbell,
  Flame,
  Gauge,
  Infinity as InfinityIcon,
  Layers,
  Medal,
  Mountain,
  Package,
  Repeat,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * Badge artwork, keyed by badge id.
 *
 * **This is the swap point for a custom icon set.** Nothing about badge
 * imagery lives in the database — the `achievements` table has no icon column
 * on purpose, because an emoji stored in Postgres is a placeholder that needs
 * a migration to replace. Change the map below and every surface follows.
 *
 * Line icons rather than emoji: emoji render differently on every platform,
 * carry their own colour, and fight a design language built on one restrained
 * accent.
 */
const ICONS: Record<string, LucideIcon> = {
  // Milestones
  first_rep: Target,
  getting_serious: Dumbbell,
  gym_regular: CalendarCheck,
  century_club: Medal,
  iron_veteran: Award,
  week_warrior: Flame,
  month_strong: CalendarDays,
  unbreakable: Mountain,

  // Volume
  set_stacker: Layers,
  set_legend: Repeat,
  rep_machine: Gauge,
  set_immortal: InfinityIcon,
  volume_machine: Package,
  ton_lifter: TrendingUp,
  heavy_hauler: Truck,
  mountain_mover: Mountain,

  // Strength
  record_breaker: Trophy,
  pr_hunter: Target,
  record_machine: Zap,
  pr_collector: Medal,
  relentless: Flame,
  pr_addict: Sparkles,
  iron_will: Shield,
  immortal: Crown,
}

/**
 * Rendered through `createElement` rather than by assigning the component to a
 * capitalised local and using it as JSX. Same output, but it does not look
 * like a component being defined during render — which is a real hazard the
 * lint rule exists to catch, even though this particular lookup is safe.
 */
export function BadgeGlyph({
  id,
  size = 26,
  strokeWidth = 1.6,
  className,
}: {
  id: string
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return createElement(ICONS[id] ?? Award, { size, strokeWidth, className })
}
