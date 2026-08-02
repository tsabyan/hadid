import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { env } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Refreshes the Supabase auth token on every request and writes the rotated
 * cookies onto the outgoing response. Server Components cannot set cookies, so
 * without this the session silently expires and users get logged out mid-week.
 *
 * Two rules keep this correct, and both are easy to break by accident:
 *
 *  1. `getClaims()` must be called. The refresh happens as a side effect of
 *     reading the session — remove the call and the cookies never rotate.
 *  2. The returned `supabaseResponse` object must be the one that is returned.
 *     Constructing a fresh NextResponse later drops the refreshed cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: env.NEXT_PUBLIC_SUPABASE_SCHEMA as 'hadid' },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  await supabase.auth.getClaims()

  return supabaseResponse
}
