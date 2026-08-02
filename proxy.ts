import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`. The runtime is always Node —
 * `edge` is not supported here and cannot be configured.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Without the negative
     * match this runs on every CSS and JS request too, which is a session
     * refresh per asset.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
}
