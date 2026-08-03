/**
 * Generates supabase/seed/reference.sql from the TypeScript data files.
 *
 * The alternative — maintaining the exercise library in both SQL and TS — is
 * the kind of duplication that stays in sync for exactly two weeks. The app
 * bundles the TS copy so search works offline; the database needs the same
 * rows for joins and the muscle-load view. One source, two outputs.
 *
 * Run: npm run seed:gen
 *
 * Node 24 strips TypeScript types natively, so the .ts data files import
 * directly. They only use `import type`, which erases completely — a runtime
 * import would need a file extension under ESM.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const { MUSCLE_GROUPS } = await import('../data/muscle-groups.ts')
const { EXERCISES, PRIMARY_THRESHOLD } = await import(
  '../data/exercises.seed.ts'
)
const { BADGES } = await import('../data/badges.config.ts')

/** Postgres string literal. Doubling the quote is the whole escape. */
const q = (value) =>
  value === null || value === undefined ? 'null' : `'${String(value).replace(/'/g, "''")}'`

const textArray = (values) =>
  values?.length ? `array[${values.map(q).join(', ')}]::text[]` : `'{}'::text[]`

const lines = []
const w = (...s) => lines.push(...s)

w(
  '-- GENERATED FILE — do not edit.',
  '-- Source: data/muscle-groups.ts, data/exercises.seed.ts, data/badges.config.ts',
  '-- Regenerate: npm run seed:gen',
  '--',
  '-- Idempotent: every statement upserts on a stable key, so re-running after',
  '-- an edit updates rows in place rather than duplicating the library.',
  '',
  'begin;',
  '',
)

// ------------------------------------------------------------ muscle groups
w('-- Muscle groups', 'insert into hadid.muscle_groups (id, name, region, body_side, svg_group, sort_order) values')
w(
  MUSCLE_GROUPS.map(
    (m, i) =>
      `  (${q(m.id)}, ${q(m.name)}, ${q(m.region)}, ${q(m.bodySide)}, ${q(m.svgGroup)}, ${i + 1})`,
  ).join(',\n') + '',
)
w(
  'on conflict (id) do update set',
  '  name = excluded.name, region = excluded.region,',
  '  body_side = excluded.body_side, svg_group = excluded.svg_group,',
  '  sort_order = excluded.sort_order;',
  '',
)

// ---------------------------------------------------------------- exercises
w('-- Built-in exercises. user_id stays null: these belong to nobody.')
w(
  'insert into hadid.exercises (slug, name, aliases, equipment, type, is_unilateral) values',
)
w(
  EXERCISES.map(
    (e) =>
      `  (${q(e.slug)}, ${q(e.name)}, ${textArray(e.aliases)}, ${q(e.equipment)}, ${q(e.type)}, ${e.unilateral ? 'true' : 'false'})`,
  ).join(',\n'),
)
w(
  'on conflict (slug) do update set',
  '  name = excluded.name, aliases = excluded.aliases,',
  '  equipment = excluded.equipment, type = excluded.type,',
  '  is_unilateral = excluded.is_unilateral;',
  '',
)

// --------------------------------------------------------- muscle mappings
w(
  '-- Mappings are replaced wholesale rather than upserted, so a muscle removed',
  '-- from an exercise in the source file is actually removed here.',
  'delete from hadid.exercise_muscles em',
  'using hadid.exercises e',
  'where e.id = em.exercise_id and e.slug is not null;',
  '',
  'insert into hadid.exercise_muscles (exercise_id, muscle_group_id, role, activation)',
  'select e.id, v.muscle_group_id, v.role, v.activation',
  'from (values',
)

const mappingRows = []
for (const exercise of EXERCISES) {
  for (const [muscle, activation] of Object.entries(exercise.muscles)) {
    const role = activation >= PRIMARY_THRESHOLD ? 'primary' : 'secondary'
    mappingRows.push(
      `  (${q(exercise.slug)}, ${q(muscle)}, ${q(role)}, ${activation.toFixed(2)})`,
    )
  }
}
w(mappingRows.join(',\n'))
w(
  ') as v(slug, muscle_group_id, role, activation)',
  'join hadid.exercises e on e.slug = v.slug',
  'on conflict (exercise_id, muscle_group_id) do update set',
  '  role = excluded.role, activation = excluded.activation;',
  '',
)

// --------------------------------------------------------------- achievements
w('-- Badge definitions')
w(
  'insert into hadid.achievements (id, category, name, description, metric, threshold, sort_order) values',
)
w(
  BADGES.map(
    (b) =>
      `  (${q(b.id)}, ${q(b.category)}, ${q(b.name)}, ${q(b.description)}, ${q(b.metric)}, ${b.threshold}, ${b.sortOrder})`,
  ).join(',\n'),
)
w(
  'on conflict (id) do update set',
  '  category = excluded.category, name = excluded.name,',
  '  description = excluded.description,',
  '  metric = excluded.metric, threshold = excluded.threshold,',
  '  sort_order = excluded.sort_order;',
  '',
  'commit;',
  '',
)

const out = join(root, 'supabase/seed/reference.sql')
await mkdir(dirname(out), { recursive: true })
await writeFile(out, lines.join('\n'), 'utf8')

console.log(
  `Wrote ${out}\n  ${MUSCLE_GROUPS.length} muscle groups` +
    `\n  ${EXERCISES.length} exercises` +
    `\n  ${mappingRows.length} muscle mappings` +
    `\n  ${BADGES.length} badges`,
)
