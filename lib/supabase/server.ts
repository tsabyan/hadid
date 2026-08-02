import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { env } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Server client for Server Components, Server Actions, and Route Handlers.
 *
 * `cookies()` is async in Next 16 — synchronous access was removed, not just
 * deprecated. Every caller must await this function.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: env.NEXT_PUBLIC_SUPABASE_SCHEMA as 'hadid' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components cannot write cookies. This throw is expected
            // and safe to swallow: `proxy.ts` refreshes the session on every
            // request, so the refreshed token still reaches the browser.
          }
        },
      },
    },
  )
}
