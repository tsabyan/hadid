import { z } from 'zod'

/**
 * Env is validated once, at import time, so a missing variable fails the build
 * rather than surfacing as a 401 from Supabase three screens into the app.
 *
 * Only `NEXT_PUBLIC_*` values are read here — they are inlined into the client
 * bundle at build time, which means they must be referenced as full literal
 * `process.env.NEXT_PUBLIC_X` expressions. Destructuring `process.env` or
 * indexing it dynamically breaks that substitution and yields undefined in the
 * browser.
 */
const publicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_SCHEMA: z.string().min(1).default('hadid'),
})

const parsed = publicEnv.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_SCHEMA: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA,
})

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}\n` +
      'Copy .env.example to .env.local and fill it in.',
  )
}

export const env = parsed.data
