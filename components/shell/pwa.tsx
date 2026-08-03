'use client'

import { useEffect, useState } from 'react'
import { Share, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { spring } from '@/lib/motion'

const HINT_KEY = 'hadid.install-hint-dismissed'

/**
 * Registers the service worker.
 *
 * Deferred to `load` so it never competes with the first render for
 * bandwidth. A worker that installs 400ms later costs nothing; one that
 * delays first paint costs the impression the app is fast.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' })
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}

/**
 * Add-to-home-screen hint for iOS Safari.
 *
 * iOS has no `beforeinstallprompt` — there is no way to offer installation
 * programmatically, and the Share → Add to Home Screen path is invisible
 * unless someone already knows it exists. Since installing is what unlocks
 * standalone display, notifications, and storage that does not get evicted
 * after a week, the hint is worth one dismissible card.
 *
 * Shown once, and never to anyone already running standalone.
 */
export function InstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari =
      /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true

    let dismissed = false
    try {
      dismissed = localStorage.getItem(HINT_KEY) === '1'
    } catch {
      // Storage blocked. Showing the hint every visit is worse than never
      // showing it, so treat the failure as "already dismissed".
      dismissed = true
    }

    if (isIos && isSafari && !standalone && !dismissed) {
      // A delay, not an ambush. Interrupting the first three seconds of a
      // first visit to ask for an install is how banners get ignored.
      const id = window.setTimeout(() => setShow(true), 8000)
      return () => window.clearTimeout(id)
    }

    return
  }, [])

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(HINT_KEY, '1')
    } catch {
      // Nothing to do — it simply may reappear next visit.
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={spring.smooth}
          className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[448px]"
        >
          <div className="bg-raised flex items-start gap-3 rounded-xl p-4 shadow-lg">
            <div className="min-w-0 flex-1">
              <p className="text-headline">Add to Home Screen</p>
              <p className="text-footnote text-text-secondary mt-0.5">
                Tap <Share size={12} className="inline" /> then “Add to Home
                Screen” for full-screen use and offline logging that sticks.
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="text-text-tertiary -m-1 p-1"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
