'use client'

import { useId } from 'react'

import { MUSCLE_GROUP_BY_ID, type MuscleGroupId } from '@/data/muscle-groups'
import { heatBucket, type MuscleLoad } from '@/lib/calc/muscle-load'
import { cn } from '@/lib/utils/cn'

/**
 * Anatomical heat map.
 *
 * Stylised rather than medical. A detailed illustration would fight the calm
 * tone and cost far more bytes than it earns — what the user needs to read at
 * a glance is "chest and triceps, not legs", and simple symmetric shapes carry
 * that as well as a textbook figure does.
 *
 * Group ids match `muscle_groups.svg_group` in the database. That coupling is
 * why the ids are stable strings: a renamed muscle silently stops tinting
 * rather than raising an error, so the names are worth guarding.
 *
 * Colour is never the only channel. Every screen that renders this also lists
 * the worked muscles as text, per the accessibility rule in docs/04.
 */

type Side = 'front' | 'back'

export function MuscleMap({
  load,
  side,
  className,
}: {
  /** Normalised 0–1 per muscle group. */
  load: MuscleLoad
  side: Side
  className?: string
}) {
  const titleId = useId()
  const shapes = side === 'front' ? FRONT : BACK

  const worked = Object.entries(load)
    .filter(([, value]) => (value ?? 0) > 0)
    .map(([id]) => MUSCLE_GROUP_BY_ID[id]?.name ?? id)

  return (
    <svg
      viewBox="0 0 100 220"
      className={cn('h-full w-auto', className)}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>
        {worked.length > 0
          ? `${side === 'front' ? 'Front' : 'Back'} view. Worked: ${worked.join(', ')}.`
          : `${side === 'front' ? 'Front' : 'Back'} view. Nothing trained.`}
      </title>

      {/* Silhouette sits underneath so untrained muscles read as part of a
          body rather than as floating blobs. */}
      <g fill="var(--surface-sunken)">
        <circle cx="50" cy="16" r="11" />
        <rect x="45" y="25" width="10" height="8" />
        <path d="M50 31 C 30 33, 20 42, 20 56 L 17 100 L 25 104 L 30 66 L 32 96 L 36 150 L 38 205 L 47 205 L 47 150 L 50 120 L 53 150 L 53 205 L 62 205 L 64 150 L 68 96 L 70 66 L 75 104 L 83 100 L 80 56 C 80 42, 70 33, 50 31 Z" />
      </g>

      <g>
        {shapes.map((shape) => (
          <g key={shape.group} id={shape.group} fill={tint(load[shape.id])}>
            {shape.paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        ))}
      </g>
    </svg>
  )
}

/** Both views side by side — how every summary surface uses this. */
export function MuscleMapPair({
  load,
  className,
}: {
  load: MuscleLoad
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-center gap-6', className)}>
      <MuscleMap load={load} side="front" />
      <MuscleMap load={load} side="back" />
    </div>
  )
}

function tint(intensity: number | undefined): string {
  const bucket = heatBucket(intensity ?? 0)
  return bucket === 0 ? 'var(--heat-0)' : `var(--heat-${bucket})`
}

type Shape = { id: MuscleGroupId; group: string; paths: string[] }

/**
 * Shapes are drawn as mirrored pairs rather than one path with a transform,
 * so a single group highlights both sides at once — training one arm is not
 * a case this app models, and a half-lit figure would read as a rendering bug.
 */
const FRONT: Shape[] = [
  {
    id: 'front_delts',
    group: 'front-delts',
    paths: [
      'M30 38 c7 -2 10 2 11 8 c1 6 -3 10 -9 10 c-6 0 -10 -4 -9 -10 c1 -5 3 -7 7 -8 Z',
      'M70 38 c-7 -2 -10 2 -11 8 c-1 6 3 10 9 10 c6 0 10 -4 9 -10 c-1 -5 -3 -7 -7 -8 Z',
    ],
  },
  {
    id: 'side_delts',
    group: 'side-delts',
    paths: [
      'M21 44 c4 -3 7 0 7 6 c0 7 -2 11 -6 11 c-4 0 -6 -5 -5 -11 c0 -3 2 -5 4 -6 Z',
      'M79 44 c-4 -3 -7 0 -7 6 c0 7 2 11 6 11 c4 0 6 -5 5 -11 c0 -3 -2 -5 -4 -6 Z',
    ],
  },
  {
    id: 'chest',
    group: 'chest',
    paths: [
      'M48 50 c-8 -1 -14 1 -14 8 c0 8 5 12 12 12 c4 0 6 -3 6 -8 l0 -10 c0 -1 -1 -2 -4 -2 Z',
      'M52 50 c8 -1 14 1 14 8 c0 8 -5 12 -12 12 c-4 0 -6 -3 -6 -8 l0 -10 c0 -1 1 -2 4 -2 Z',
    ],
  },
  {
    id: 'biceps',
    group: 'biceps',
    paths: [
      'M27 58 c4 0 6 4 6 11 c0 7 -2 12 -6 12 c-4 0 -6 -5 -6 -12 c0 -7 2 -11 6 -11 Z',
      'M73 58 c-4 0 -6 4 -6 11 c0 7 2 12 6 12 c4 0 6 -5 6 -12 c0 -7 -2 -11 -6 -11 Z',
    ],
  },
  {
    id: 'forearms',
    group: 'forearms',
    paths: [
      'M23 84 c4 0 6 5 6 13 c0 8 -2 13 -6 13 c-4 0 -5 -5 -5 -13 c0 -8 1 -13 5 -13 Z',
      'M77 84 c-4 0 -6 5 -6 13 c0 8 2 13 6 13 c4 0 5 -5 5 -13 c0 -8 -1 -13 -5 -13 Z',
    ],
  },
  {
    id: 'abs',
    group: 'abs',
    paths: [
      'M43 72 h14 c1 0 2 1 2 3 v22 c0 4 -3 6 -9 6 c-6 0 -9 -2 -9 -6 v-22 c0 -2 1 -3 2 -3 Z',
    ],
  },
  {
    id: 'obliques',
    group: 'obliques',
    paths: [
      'M39 74 c-3 1 -4 4 -4 9 v12 c0 4 1 6 3 6 c2 0 3 -2 3 -6 v-19 c0 -2 -1 -3 -2 -2 Z',
      'M61 74 c3 1 4 4 4 9 v12 c0 4 -1 6 -3 6 c-2 0 -3 -2 -3 -6 v-19 c0 -2 1 -3 2 -2 Z',
    ],
  },
  {
    id: 'quads',
    group: 'quads',
    paths: [
      'M42 110 c5 0 8 6 8 18 c0 14 -3 24 -8 24 c-5 0 -8 -10 -8 -24 c0 -12 3 -18 8 -18 Z',
      'M58 110 c-5 0 -8 6 -8 18 c0 14 3 24 8 24 c5 0 8 -10 8 -24 c0 -12 -3 -18 -8 -18 Z',
    ],
  },
  {
    id: 'adductors',
    group: 'adductors',
    paths: [
      'M47 108 c2 0 3 4 3 12 c0 9 -1 14 -3 14 c-2 0 -3 -5 -3 -14 c0 -8 1 -12 3 -12 Z',
      'M53 108 c-2 0 -3 4 -3 12 c0 9 1 14 3 14 c2 0 3 -5 3 -14 c0 -8 -1 -12 -3 -12 Z',
    ],
  },
  {
    id: 'calves',
    group: 'calves',
    paths: [
      'M42 160 c4 0 6 6 6 16 c0 10 -2 16 -6 16 c-4 0 -5 -6 -5 -16 c0 -10 1 -16 5 -16 Z',
      'M58 160 c-4 0 -6 6 -6 16 c0 10 2 16 6 16 c4 0 5 -6 5 -16 c0 -10 -1 -16 -5 -16 Z',
    ],
  },
]

const BACK: Shape[] = [
  {
    id: 'traps',
    group: 'traps',
    paths: [
      'M50 32 c-10 1 -18 6 -21 14 c-1 3 1 5 4 4 c6 -2 11 -3 17 -3 c6 0 11 1 17 3 c3 1 5 -1 4 -4 c-3 -8 -11 -13 -21 -14 Z',
      'M50 48 c-5 0 -9 1 -9 5 c0 5 4 12 9 12 c5 0 9 -7 9 -12 c0 -4 -4 -5 -9 -5 Z',
    ],
  },
  {
    id: 'rear_delts',
    group: 'rear-delts',
    paths: [
      'M30 39 c7 -2 10 2 11 8 c1 6 -3 10 -9 10 c-6 0 -10 -4 -9 -10 c1 -5 3 -7 7 -8 Z',
      'M70 39 c-7 -2 -10 2 -11 8 c-1 6 3 10 9 10 c6 0 10 -4 9 -10 c-1 -5 -3 -7 -7 -8 Z',
    ],
  },
  {
    id: 'side_delts',
    group: 'side-delts-back',
    paths: [
      'M21 44 c4 -3 7 0 7 6 c0 7 -2 11 -6 11 c-4 0 -6 -5 -5 -11 c0 -3 2 -5 4 -6 Z',
      'M79 44 c-4 -3 -7 0 -7 6 c0 7 2 11 6 11 c4 0 6 -5 5 -11 c0 -3 -2 -5 -4 -6 Z',
    ],
  },
  {
    id: 'lats',
    group: 'lats',
    paths: [
      'M37 54 c-4 2 -6 8 -6 16 c0 10 3 18 8 22 c3 2 5 0 6 -4 l2 -20 c1 -6 -1 -10 -4 -12 Z',
      'M63 54 c4 2 6 8 6 16 c0 10 -3 18 -8 22 c-3 2 -5 0 -6 -4 l-2 -20 c-1 -6 1 -10 4 -12 Z',
    ],
  },
  {
    id: 'rhomboids',
    group: 'rhomboids',
    paths: [
      'M43 52 c-3 0 -4 2 -4 6 v8 c0 3 2 4 5 3 l6 -2 v-15 Z',
      'M57 52 c3 0 4 2 4 6 v8 c0 3 -2 4 -5 3 l-6 -2 v-15 Z',
    ],
  },
  {
    id: 'triceps',
    group: 'triceps',
    paths: [
      'M27 58 c4 0 6 4 6 11 c0 7 -2 12 -6 12 c-4 0 -6 -5 -6 -12 c0 -7 2 -11 6 -11 Z',
      'M73 58 c-4 0 -6 4 -6 11 c0 7 2 12 6 12 c4 0 6 -5 6 -12 c0 -7 -2 -11 -6 -11 Z',
    ],
  },
  {
    id: 'forearms',
    group: 'forearms-back',
    paths: [
      'M23 84 c4 0 6 5 6 13 c0 8 -2 13 -6 13 c-4 0 -5 -5 -5 -13 c0 -8 1 -13 5 -13 Z',
      'M77 84 c-4 0 -6 5 -6 13 c0 8 2 13 6 13 c4 0 5 -5 5 -13 c0 -8 -1 -13 -5 -13 Z',
    ],
  },
  {
    id: 'lower_back',
    group: 'lower-back',
    paths: [
      'M43 86 h14 c1 0 2 1 2 3 v12 c0 3 -3 5 -9 5 c-6 0 -9 -2 -9 -5 v-12 c0 -2 1 -3 2 -3 Z',
    ],
  },
  {
    id: 'glutes',
    group: 'glutes',
    paths: [
      'M42 106 c6 0 9 4 9 11 c0 7 -4 11 -10 11 c-6 0 -9 -4 -9 -11 c0 -7 4 -11 10 -11 Z',
      'M58 106 c-6 0 -9 4 -9 11 c0 7 4 11 10 11 c6 0 9 -4 9 -11 c0 -7 -4 -11 -10 -11 Z',
    ],
  },
  {
    id: 'hamstrings',
    group: 'hamstrings',
    paths: [
      'M42 132 c5 0 8 6 8 17 c0 12 -3 20 -8 20 c-5 0 -8 -8 -8 -20 c0 -11 3 -17 8 -17 Z',
      'M58 132 c-5 0 -8 6 -8 17 c0 12 3 20 8 20 c5 0 8 -8 8 -20 c0 -11 -3 -17 -8 -17 Z',
    ],
  },
  {
    id: 'calves',
    group: 'calves-back',
    paths: [
      'M42 158 c4 0 7 7 7 18 c0 11 -3 17 -7 17 c-4 0 -6 -6 -6 -17 c0 -11 2 -18 6 -18 Z',
      'M58 158 c-4 0 -7 7 -7 18 c0 11 3 17 7 17 c4 0 6 -6 6 -17 c0 -11 -2 -18 -6 -18 Z',
    ],
  },
]
