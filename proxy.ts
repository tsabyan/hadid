import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

/**
 * Reachable without a session. Everything else redirects to onboarding.
 *
 * `/offline` is here because the service worker serves it when a navigation
 * fails — a redirect to /welcome at that moment would replace a useful
 * message with a sign-up screen that also cannot load.
 */
const PUBLIC_PATHS = ['/welcome', '/auth', '/dev', '/offline']

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`. The runtime is always Node —
 * `edge` is not supported here and cannot be configured.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  /*
   * Redirects apply to page navigations only.
   *
   * A Server Action is a POST to the URL of the page that invoked it. When
   * onboarding signs in anonymously and then calls completeOnboarding(), that
   * POST goes to /welcome carrying a fresh session — and the "already signed
   * in, go home" rule below would answer it with a 307 to /. The browser then
   * receives a redirect where it expected an action result and reports
   * "An unexpected response was received from the server", which says nothing
   * about the actual cause.
   *
   * Guarding on method is enough: only GET can be a navigation.
   */
  if (request.method !== 'GET') return response

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
     *
     * `sw.js` must be excluded explicitly. A service worker script may not be
     * served from behind a redirect — the spec disallows it — so letting the
     * unauthenticated redirect apply here makes registration fail outright
     * with "The script resource is behind a redirect".
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|icons/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
}
