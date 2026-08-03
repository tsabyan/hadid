'use client'

import { createClient } from '@/lib/supabase/client'
import {
  dropFromQueue,
  enqueue,
  markAttempt,
  queueSize,
  readQueue,
  type QueuedOp,
} from './db'
import { isPermanent } from './retry'

/**
 * Write queue.
 *
 * Every mutation made during a workout goes through here rather than through
 * a Server Action. A Server Action needs the network by definition; a queued
 * op needs it eventually. In a gym basement that is the whole difference.
 *
 * Replay is strictly FIFO. Ordering is not a nicety — a set references a
 * workout_exercise, which references a workout, and replaying those out of
 * order produces foreign key violations that look like data loss.
 *
 * Every op is idempotent on a client-generated id, so replaying one that
 * actually did land is a no-op rather than a duplicate.
 */

type Listener = (state: SyncState) => void

export type SyncState = {
  pending: number
  syncing: boolean
  online: boolean
  lastError: string | null
}

let state: SyncState = {
  pending: 0,
  syncing: false,
  online: true,
  lastError: null,
}

const listeners = new Set<Listener>()

function emit(next: Partial<SyncState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener(state)
}

export function subscribeSync(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSyncState = () => state

/**
 * Queues an op and immediately tries to flush.
 *
 * Callers never await the network — they await the durable write only. The
 * UI has already rendered the change optimistically by this point.
 */
export async function queueOp(op: QueuedOp) {
  await enqueue(op)
  emit({ pending: await queueSize() })
  void flush()
}

let flushing = false

export async function flush(): Promise<void> {
  if (flushing) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    emit({ online: false })
    return
  }

  flushing = true
  emit({ syncing: true, online: true })

  const supabase = createClient()

  try {
    const entries = await readQueue()

    for (const entry of entries) {
      const error = await apply(supabase, entry)

      if (!error) {
        await dropFromQueue(entry.seq)
        emit({ pending: await queueSize(), lastError: null })
        continue
      }

      if (isPermanent(error)) {
        // Dropped rather than retried forever. Keeping it would stall every
        // later op behind an operation that can never succeed.
        await dropFromQueue(entry.seq)
        emit({
          pending: await queueSize(),
          lastError: `Discarded ${entry.kind}: ${error.message}`,
        })
        continue
      }

      await markAttempt(entry.seq, error.message)
      emit({ lastError: error.message })
      // Stop on the first transient failure. The rest of the queue depends on
      // this op having landed.
      break
    }
  } finally {
    flushing = false
    emit({ syncing: false, pending: await queueSize() })
  }
}

type ApplyError = { message: string; code?: string; status?: number } | null

async function apply(
  supabase: ReturnType<typeof createClient>,
  entry: { kind: QueuedOp['kind']; payload: unknown },
): Promise<ApplyError> {
  try {
    switch (entry.kind) {
      case 'workout.create': {
        const payload = entry.payload as Extract<
          QueuedOp,
          { kind: 'workout.create' }
        >['payload']
        const { error } = await supabase
          .from('workouts')
          .upsert(payload, { onConflict: 'id' })
        return error
      }

      case 'workout_exercise.create': {
        const payload = entry.payload as Extract<
          QueuedOp,
          { kind: 'workout_exercise.create' }
        >['payload']
        const { error } = await supabase
          .from('workout_exercises')
          .upsert(payload, { onConflict: 'id' })
        return error
      }

      case 'set.upsert': {
        const payload = entry.payload as Extract<
          QueuedOp,
          { kind: 'set.upsert' }
        >['payload']
        const { error } = await supabase
          .from('sets')
          .upsert(payload, { onConflict: 'id' })
        return error
      }

      case 'set.delete': {
        const payload = entry.payload as { id: string }
        const { error } = await supabase
          .from('sets')
          .delete()
          .eq('id', payload.id)
        return error
      }

      case 'workout.finish': {
        const payload = entry.payload as { id: string }
        const { error } = await supabase.rpc('finish_workout', {
          p_workout_id: payload.id,
        })
        return error
      }

      default:
        return { message: `Unknown op ${entry.kind}`, status: 400 }
    }
  } catch (cause) {
    // Thrown rather than returned means the fetch itself failed — offline,
    // DNS, TLS. Always transient.
    return {
      message: cause instanceof Error ? cause.message : 'Network error',
    }
  }
}

/**
 * Wires flush to every signal that the network might be back.
 *
 * `online` alone is not enough: it fires on interface changes that do not
 * imply reachability, and misses the case where a phone regains signal while
 * the tab is backgrounded. Visibility covers the second, and both are cheap.
 */
export function startSyncWatcher() {
  if (typeof window === 'undefined') return () => {}

  const onOnline = () => {
    emit({ online: true })
    void flush()
  }
  const onOffline = () => emit({ online: false })
  const onVisible = () => {
    if (document.visibilityState === 'visible') void flush()
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)

  emit({ online: navigator.onLine })
  void queueSize().then((pending) => emit({ pending }))
  void flush()

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
