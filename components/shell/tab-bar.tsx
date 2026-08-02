'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CalendarDays,
  Dumbbell,
  Settings,
  Trophy,
} from 'lucide-react'

import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/', label: 'Home', icon: Dumbbell },
  { href: '/history', label: 'History', icon: CalendarDays },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/achievements', label: 'Badges', icon: Trophy },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

/**
 * Bottom tab bar. Hidden during an active workout — see docs/05 — so nothing
 * competes with the logger for the thumb.
 */
export function TabBar() {
  const pathname = usePathname()

  return (
    <nav className="material-thin border-separator pb-safe fixed inset-x-0 bottom-0 z-30 border-t">
      <ul className="mx-auto flex max-w-[480px] items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex touch-manipulation flex-col items-center gap-0.5 py-2',
                  'transition-colors duration-150',
                  active ? 'text-accent' : 'text-text-tertiary',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
