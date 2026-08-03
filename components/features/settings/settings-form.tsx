'use client'

import { useState, useTransition } from 'react'

import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Stepper } from '@/components/ui/stepper'
import { ThemeSwitcher } from '@/components/theme'
import { updateProfile } from '@/lib/db/mutations'
import type { UnitSystem } from '@/lib/calc/units'

/**
 * Preferences save on change rather than behind a Save button.
 *
 * Every field here is a single value with an immediately visible effect, and
 * a form that needs confirming to change a unit label is friction with no
 * payoff. Failures roll the control back rather than leaving the UI claiming
 * a setting that never persisted.
 */
export function SettingsForm({
  unit: initialUnit,
  defaultRestSeconds: initialRest,
  weekStartsOn: initialWeekStart,
}: {
  unit: UnitSystem
  defaultRestSeconds: number
  weekStartsOn: number
}) {
  const [, startTransition] = useTransition()

  const [unit, setUnit] = useState(initialUnit)
  const [rest, setRest] = useState(initialRest)
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [error, setError] = useState<string | null>(null)

  function persist<T>(
    value: T,
    apply: (value: T) => void,
    revert: T,
    payload: Parameters<typeof updateProfile>[0],
  ) {
    apply(value)
    setError(null)
    startTransition(async () => {
      try {
        await updateProfile(payload)
      } catch {
        apply(revert)
        setError('Could not save that. Check your connection.')
      }
    })
  }

  return (
    <main className="flex flex-col gap-6 px-5 py-5">
      <Section title="Appearance">
        <ThemeSwitcher />
      </Section>

      <Section title="Units">
        <Segmented
          value={unit}
          onChange={(next) =>
            persist(next, setUnit, unit, { unit_system: next })
          }
          options={[
            { value: 'metric', label: 'Kilograms' },
            { value: 'imperial', label: 'Pounds' },
          ]}
        />
        <p className="text-footnote text-text-secondary">
          Weights are always stored in kilograms. Switching units changes how
          they are displayed, never what your history says you lifted.
        </p>
      </Section>

      <Section title="Default rest">
        <Card className="flex items-center justify-between">
          <span className="text-callout">Between working sets</span>
          <Stepper
            value={rest}
            step={15}
            max={900}
            onChange={(next) =>
              persist(next, setRest, rest, { default_rest_seconds: next })
            }
            className="w-40"
          />
        </Card>
      </Section>

      <Section title="Week starts on">
        <Segmented
          value={String(weekStart)}
          onChange={(next) =>
            persist(
              Number(next),
              setWeekStart,
              weekStart,
              { week_starts_on: Number(next) },
            )
          }
          options={[
            { value: '1', label: 'Monday' },
            { value: '0', label: 'Sunday' },
          ]}
        />
      </Section>

      {error && <p className="text-footnote text-danger">{error}</p>}
    </main>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-overline text-text-tertiary uppercase">{title}</h2>
      {children}
    </section>
  )
}
