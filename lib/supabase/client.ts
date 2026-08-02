import { createBrowserClient } from '@supabase/ssr'

import { env } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Browser client. Safe to call repeatedly — `createBrowserClient` memoises the
 * underlying instance, so this does not open a new connection per call.
 *
 * The `db.schema` option is not optional here: this app's tables live in the
 * `hadid` schema because the Supabase project is shared with other apps.
 * Without it every query targets `public` and 404s.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { db: { schema: env.NEXT_PUBLIC_SUPABASE_SCHEMA as 'hadid' } },
  )
}
