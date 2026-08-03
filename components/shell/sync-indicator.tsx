'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { getSyncState, startSyncWatcher, subscribeSync } from '@/lib/offline/queue'
import { spring } from '@/lib/motion'

const SERVER_STATE = {
  pending: 0,
  syncing: false,
  online: true,
  lastError: null,
}

/**
 * Offline and sync status.
 *
 * Deliberately small and quiet. Nothing here blocks the user: work continues
 * offline, and the only honest thing to communicate is "not saved to the
 * server yet", not "something is wrong". A modal or a red banner would be
 * lying about the severity.
 */
export function SyncIndicator() {
  const state = useSyncExternalStore(
    subscribeSync,
    getSyncState,
    () => SERVER_STATE,
  )

  useEffect(() => startSyncWatcher(), [])

  const show = !state.online || state.pending > 0

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring.snappy}
          className="bg-sunken text-text-secondary text-caption flex items-center gap-1.5 rounded-full px-2.5 py-1"
          role="status"
          aria-live="polite"
        >
          {state.online ? (
            <RefreshCw
              size={12}
              className={state.syncing ? 'animate-spin' : undefined}
            />
          ) : (
            <CloudOff size={12} />
          )}
          <span>
            {!state.online
              ? 'Offline'
              : state.pending === 1
                ? '1 unsaved'
                : `${state.pending} unsaved`}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
