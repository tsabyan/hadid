import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`. The runtime is always Node —
 * `edge` is not supported here and cannot be configured.
 */
/** Reachable without a session. Everything else redirects to onboarding. */
const PUBLIC_PATHS = ['/welcome', '/auth', '/dev']

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

  // The session is created by the onboarding CTA, not here. Signing in
  // anonymously from the proxy would mint a user for every crawler and
  // preflight that touches the origin.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  // A signed-in user has no business on the welcome screen.
  if (user && pathname === '/welcome') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
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
