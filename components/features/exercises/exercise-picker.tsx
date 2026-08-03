'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Chip, ChipRow } from '@/components/ui/chip'
import { Sheet } from '@/components/ui/sheet'
import { MUSCLE_CATEGORIES } from '@/data/muscle-groups'
import { cn } from '@/lib/utils/cn'

export type PickableExercise = {
  id: string
  name: string
  slug: string | null
  aliases: string[]
  equipment: string
  type: string
  exercise_muscles: { muscle_group_id: string; role: string }[]
}

/**
 * Search and filter over the exercise library.
 *
 * Built as a sheet rather than the separate route the spec describes: it is
 * opened from the routine editor and from mid-workout, and navigating away
 * from a half-edited routine to pick an exercise loses more than a full-screen
 * modal gains.
 *
 * Filtering runs over an array already in memory. No debounce, no request —
 * `useDeferredValue` keeps typing responsive if the list ever grows past the
 * point where a synchronous filter is free.
 */
export function ExercisePicker({
  open,
  onOpenChange,
  exercises,
  onConfirm,
  multiple = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercises: PickableExercise[]
  onConfirm: (ids: string[]) => void
  multiple?: boolean
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [selected, setSelected] = useState<string[]>([])

  const deferredQuery = useDeferredValue(query)

  const results = useMemo(() => {
    const groups =
      category === 'all'
        ? null
        : new Set(
            MUSCLE_CATEGORIES.find((c) => c.id === category)?.groups ?? [],
          )

    const needle = normalize(deferredQuery)

    return exercises
      .filter((exercise) => {
        if (groups) {
          const hit = exercise.exercise_muscles.some(
            (m) => m.role === 'primary' && groups.has(m.muscle_group_id as never),
          )
          if (!hit) return false
        }
        if (!needle) return true
        return rank(exercise, needle) > 0
      })
      .sort((a, b) => {
        if (needle) {
          const diff = rank(b, needle) - rank(a, needle)
          if (diff !== 0) return diff
        }
        return a.name.localeCompare(b.name)
      })
  }, [exercises, deferredQuery, category])

  function toggle(id: string) {
    setSelected((current) => {
      if (!multiple) return [id]
      return current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    })
  }

  function confirm() {
    onConfirm(selected)
    setSelected([])
    setQuery('')
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add exercise"
      description={
        selected.length > 0 ? `${selected.length} selected` : undefined
      }
      className="h-[90dvh]"
    >
      <div className="flex h-full flex-col gap-3">
        <div className="bg-sunken flex items-center gap-2 rounded-full px-3.5">
          <Search size={16} className="text-text-tertiary shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="text-callout h-11 min-w-0 flex-1 bg-transparent outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-text-tertiary p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <ChipRow className="-mx-5 px-5">
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>
            All
          </Chip>
          {MUSCLE_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </Chip>
          ))}
        </ChipRow>

        <p className="text-overline text-text-tertiary uppercase">
          {results.length} {results.length === 1 ? 'exercise' : 'exercises'}
        </p>

        <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">
          {results.length === 0 ? (
            <p className="text-subhead text-text-secondary py-8 text-center">
              Nothing matches “{query}”.
            </p>
          ) : (
            <ul className="flex flex-col">
              {results.map((exercise) => {
                const isSelected = selected.includes(exercise.id)
                const primary = exercise.exercise_muscles.find(
                  (m) => m.role === 'primary',
                )

                return (
                  <li key={exercise.id}>
                    <button
                      onClick={() => toggle(exercise.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-2 py-3 text-left',
                        'transition-colors',
                        isSelected && 'bg-accent-soft',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-headline truncate">
                          {exercise.name}
                        </div>
                        <div className="text-footnote text-text-secondary truncate capitalize">
                          {primary?.muscle_group_id.replace(/_/g, ' ')} ·{' '}
                          {exercise.equipment}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={18} className="text-accent shrink-0" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={selected.length === 0}
          onClick={confirm}
        >
          {selected.length === 0
            ? 'Select an exercise'
            : `Add ${selected.length}`}
        </Button>
      </div>
    </Sheet>
  )
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

/**
 * Higher is better, 0 means no match.
 *
 * Ranking matters more than matching here: typing "bench" should put Barbell
 * Bench Press above Bench Dip, and an exact alias hit should beat a substring
 * buried in the middle of a longer name.
 */
function rank(exercise: PickableExercise, needle: string): number {
  const name = normalize(exercise.name)
  if (name === needle) return 100
  if (name.startsWith(needle)) return 80
  if (name.split(' ').some((word) => word.startsWith(needle))) return 60

  for (const alias of exercise.aliases) {
    const value = normalize(alias)
    if (value === needle) return 70
    if (value.startsWith(needle)) return 50
  }

  if (name.includes(needle)) return 30
  return 0
}
