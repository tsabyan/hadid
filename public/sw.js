/*
 * Service worker — hand-written rather than generated.
 *
 * next-pwa and friends assume a webpack build; this project builds with
 * Turbopack on Next 16. A generated worker also hides the one decision that
 * actually matters here, which is what must never be cached.
 *
 * Strategy per request type:
 *   navigation      network-first, falling back to the cached shell
 *   /_next/static   cache-first — content-hashed, so it can never go stale
 *   icons, manifest cache-first
 *   Supabase API    never touched — the write queue owns durability, and a
 *                   cached POST response would be a lie about what persisted
 */

const VERSION = 'v1'
const SHELL_CACHE = `hadid-shell-${VERSION}`
const ASSET_CACHE = `hadid-assets-${VERSION}`

const SHELL_URLS = ['/', '/offline']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll rejects the whole batch if any URL 404s, which would leave the
      // worker uninstalled. Individual puts degrade instead.
      .then((cache) =>
        Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.endsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Anything crossing to Supabase goes straight to the network. Serving a
  // stale workout from cache would contradict what the queue is holding.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const shell = await caches.match('/')
          if (shell) return shell
          return (
            (await caches.match('/offline')) ??
            new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          )
        }),
    )
    return
  }

  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'

  if (!isStatic) return

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches
              .open(ASSET_CACHE)
              .then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
