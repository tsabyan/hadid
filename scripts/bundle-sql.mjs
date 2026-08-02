/**
 * Concatenates every migration plus the generated seed into a single file.
 *
 * There is no linked Supabase CLI on this project — SQL is applied by pasting
 * it into the dashboard editor. Eleven separate pastes in the right order is a
 * process that goes wrong on a Sunday; one file does not.
 *
 * Run: npm run sql:bundle
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase/migrations')
const seedFile = join(root, 'supabase/seed/reference.sql')

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()

const parts = [
  '-- GENERATED FILE — do not edit. Run: npm run sql:bundle',
  '--',
  '-- Every migration in order, followed by the reference seed.',
  '-- Safe to re-run: every statement is idempotent.',
  '--',
  '-- Paste into Supabase → SQL Editor → Run.',
  '-- Afterwards, add `hadid` under Settings → API → Exposed schemas, or every',
  '-- query returns 404 no matter how correct the grants and policies are.',
  '',
]

for (const file of files) {
  parts.push(
    '',
    `-- ===========================================================================`,
    `-- ${file}`,
    `-- ===========================================================================`,
    '',
    (await readFile(join(migrationsDir, file), 'utf8')).trimEnd(),
  )
}

let seed = ''
try {
  seed = await readFile(seedFile, 'utf8')
} catch {
  console.warn('No seed found — run `npm run seed:gen` first.')
}

if (seed) {
  parts.push(
    '',
    '-- ===========================================================================',
    '-- seed/reference.sql',
    '-- ===========================================================================',
    '',
    seed.trimEnd(),
  )
}

const out = join(root, 'supabase/apply-all.sql')
await writeFile(out, parts.join('\n') + '\n', 'utf8')

console.log(`Wrote ${out} (${files.length} migrations${seed ? ' + seed' : ''})`)
