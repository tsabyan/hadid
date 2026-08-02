'use client'

import { useState } from 'react'
import { Dumbbell, Flame, Share2, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip, ChipRow } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { ListGroup, ListRow } from '@/components/ui/list-row'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Segmented } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { Stepper } from '@/components/ui/stepper'
import { ThemeSwitcher } from '@/components/theme'
import { Header } from '@/components/shell/header'

/**
 * Component gallery. Not optional infrastructure — without a single page that
 * renders every component in every state, states get discovered in production.
 *
 * Review checklist lives in docs/04 section 10. This page is where it is run,
 * in both themes, with reduced motion on and off.
 */
export default function ComponentGallery() {
  const [tab, setTab] = useState<'stats' | 'focus'>('stats')
  const [filter, setFilter] = useState('all')
  const [weight, setWeight] = useState(60)
  const [reps, setReps] = useState(8)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <Header title="Components" />

      <main className="mx-auto w-full max-w-[480px] px-5 pt-6 pb-24">
        <Section title="Theme">
          <ThemeSwitcher />
          <p className="text-footnote text-text-secondary">
            Every block below must pass in all three settings.
          </p>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tinted">Tinted</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
          <Button variant="primary" size="lg" fullWidth>
            Start Workout
          </Button>
        </Section>

        <Section title="Segmented">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'stats', label: 'Stats' },
              { value: 'focus', label: 'Focus' },
            ]}
          />
        </Section>

        <Section title="Chips">
          <ChipRow>
            {['all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'].map(
              (c) => (
                <Chip
                  key={c}
                  active={filter === c}
                  onClick={() => setFilter(c)}
                  className="capitalize"
                >
                  {c}
                </Chip>
              ),
            )}
          </ChipRow>
        </Section>

        <Section title="Stat cards">
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
            <StatCard
              label="Streak"
              value={12}
              sub="days"
              icon={<Flame size={14} className="text-accent" />}
            />
            <StatCard label="This week" value="8,240" sub="kg" delta={24} />
            <StatCard label="Last week" value="6,110" sub="kg" delta={-18} />
          </div>
        </Section>

        <Section title="Steppers">
          <Card className="flex gap-4">
            <Stepper
              label="Weight (kg)"
              value={weight}
              onChange={setWeight}
              step={2.5}
              decimals={1}
              className="flex-1"
            />
            <Stepper
              label="Reps"
              value={reps}
              onChange={setReps}
              max={50}
              className="flex-1"
            />
          </Card>
          <p className="text-footnote text-text-secondary">
            Hold a stepper to accelerate: 500ms delay, then 100ms, then 40ms
            after ten steps.
          </p>
        </Section>

        <Section title="Cards">
          <Card>Static surface.</Card>
          <Card interactive>Interactive — press to feel the scale.</Card>
        </Section>

        <Section title="List">
          <ListGroup>
            <ListRow
              title="Barbell Bench Press"
              subtitle="Chest · Barbell"
              chevron
            />
            <ListRow
              title="Incline Dumbbell Press"
              subtitle="Chest · Dumbbell"
              chevron
            />
            <ListRow
              title="Cable Fly"
              subtitle="Chest · Cable"
              trailing={
                <span className="text-caption text-text-tertiary">
                  STRENGTH
                </span>
              }
            />
          </ListGroup>
        </Section>

        <Section title="Progress ring">
          <div className="flex items-center gap-5">
            <ProgressRing progress={0.25} />
            <ProgressRing progress={0.68} size={88} strokeWidth={7}>
              <span className="tabular font-mono text-lg font-semibold">
                1:45
              </span>
            </ProgressRing>
            <ProgressRing progress={1} size={56} strokeWidth={5} />
          </div>
        </Section>

        <Section title="Heat ramp">
          <div className="flex gap-1.5">
            {(['heat-0', 'heat-1', 'heat-2', 'heat-3', 'heat-4'] as const).map(
              (h, i) => (
                <div key={h} className="flex-1 text-center">
                  <div
                    className="h-12 rounded-md"
                    style={{ background: `var(--${h})` }}
                  />
                  <span className="text-caption text-text-tertiary">{i}</span>
                </div>
              ),
            )}
          </div>
        </Section>

        <Section title="Type scale">
          <div className="flex flex-col gap-1">
            <p className="text-display">Display 34</p>
            <p className="text-title-1">Title 1 · 28</p>
            <p className="text-title-2">Title 2 · 22</p>
            <p className="text-title-3">Title 3 · 20</p>
            <p className="text-headline">Headline 17</p>
            <p className="text-body">Body 17 — the default reading size.</p>
            <p className="text-subhead text-text-secondary">Subhead 15</p>
            <p className="text-footnote text-text-secondary">Footnote 13</p>
            <p className="text-caption text-text-tertiary">Caption 12</p>
            <p className="text-overline text-text-tertiary uppercase">
              Overline 11
            </p>
            <p className="tabular font-mono text-2xl font-semibold">
              1234567890
            </p>
          </div>
        </Section>

        <Section title="Elevation">
          <div className="grid grid-cols-4 gap-3">
            {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
              <div
                key={s}
                className="bg-surface flex h-16 items-center justify-center rounded-lg text-xs"
                style={{ boxShadow: `var(--shadow-${s})` }}
              >
                {s}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Sheet">
          <Button variant="tinted" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
          <Sheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Century Club"
            description="Complete 100 workouts."
          >
            <div className="flex flex-col gap-4">
              <ProgressRing progress={0.75} size={96} className="mx-auto">
                <span className="tabular font-mono font-semibold">75</span>
              </ProgressRing>
              <p className="text-subhead text-text-secondary text-center">
                Drag down or flick to dismiss.
              </p>
              <Button
                variant="primary"
                fullWidth
                onClick={() => setSheetOpen(false)}
              >
                Done
              </Button>
            </div>
          </Sheet>
        </Section>

        <Section title="Skeletons">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </Section>

        <Section title="Empty state">
          <Card className="p-0">
            <EmptyState
              icon={Dumbbell}
              title="No routines yet"
              description="Build one from a template, or start from an empty plan."
              action={<Button variant="tinted">Create routine</Button>}
            />
          </Card>
        </Section>

        <Section title="Semantic colours">
          <div className="flex flex-wrap gap-2">
            {(['accent', 'success', 'warning', 'danger'] as const).map((c) => (
              <div
                key={c}
                className="text-caption rounded-md px-3 py-2 font-semibold text-white"
                style={{ background: `var(--${c})` }}
              >
                {c}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Header trailing slot">
          <Card className="flex items-center justify-between">
            <span className="text-subhead text-text-secondary">
              Icon buttons sit in the header trailing slot
            </span>
            <div className="flex">
              <button className="text-accent flex size-11 items-center justify-center">
                <Share2 size={20} />
              </button>
              <button className="text-accent flex size-11 items-center justify-center">
                <TrendingUp size={20} />
              </button>
            </div>
          </Card>
        </Section>
      </main>
    </>
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
    <section className="mb-8 flex flex-col gap-3">
      <h2 className="text-overline text-text-tertiary uppercase">{title}</h2>
      {children}
    </section>
  )
}
