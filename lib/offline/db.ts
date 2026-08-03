'use client'

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/**
 * Local durable storage.
 *
 * IndexedDB rather than localStorage or memory, for one reason: a set logged
 * in a basement has to survive a force-quit. localStorage is synchronous and
 * capped at a few megabytes; memory does not survive the tab being evicted,
 * which iOS does aggressively to backgrounded pages.
 *
 * Three stores, three jobs:
 *   queue   — writes that have not reached the server yet, replayed in order
 *   session — the active workout, so a reload mid-set loses nothing
 *   cache   — read-through copies of library and history for offline screens
 */

export type QueuedOp =
  | {
      kind: 'set.upsert'
      payload: {
        id: string
        workout_exercise_id: string
        set_number: number
        weight_kg: number
        reps: number
        is_warmup: boolean
        rpe?: number | null
      }
    }
  | { kind: 'set.delete'; payload: { id: string } }
  | {
      kind: 'workout.create'
      payload: {
        id: string
        user_id: string
        routine_version_id?: string | null
        name: string
      }
    }
  | {
      kind: 'workout_exercise.create'
      payload: {
        id: string
        workout_id: string
        exercise_id: string
        position: number
      }
    }
  | { kind: 'workout.finish'; payload: { id: string } }

export type QueueEntry = QueuedOp & {
  seq: number
  createdAt: number
  attempts: number
  lastError?: string
}

interface HadidDB extends DBSchema {
  queue: {
    key: number
    value: Omit<QueueEntry, 'seq'> & { seq?: number }
    indexes: { byCreatedAt: number }
  }
  session: {
    key: string
    value: { key: string; value: unknown; updatedAt: number }
  }
  cache: {
    key: string
    value: { key: string; value: unknown; updatedAt: number }
  }
}

let dbPromise: Promise<IDBPDatabase<HadidDB>> | null = null

export function getDb() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is browser-only')
  }
  dbPromise ??= openDB<HadidDB>('hadid', 1, {
    upgrade(db) {
      const queue = db.createObjectStore('queue', {
        keyPath: 'seq',
        // Monotonic keys are what make replay order meaningful: a set cannot
        // be inserted before the workout_exercise it belongs to.
        autoIncrement: true,
      })
      queue.createIndex('byCreatedAt', 'createdAt')

      db.createObjectStore('session', { keyPath: 'key' })
      db.createObjectStore('cache', { keyPath: 'key' })
    },
  })
  return dbPromise
}

// ------------------------------------------------------------------- queue

export async function enqueue(op: QueuedOp): Promise<number> {
  const db = await getDb()
  return db.add('queue', { ...op, createdAt: Date.now(), attempts: 0 })
}

export async function readQueue(): Promise<QueueEntry[]> {
  const db = await getDb()
  const rows = await db.getAll('queue')
  return rows
    .filter((row): row is QueueEntry => typeof row.seq === 'number')
    .sort((a, b) => a.seq - b.seq)
}

export async function dropFromQueue(seq: number) {
  const db = await getDb()
  await db.delete('queue', seq)
}

export async function markAttempt(seq: number, error: string) {
  const db = await getDb()
  const row = await db.get('queue', seq)
  if (!row) return
  await db.put('queue', {
    ...row,
    attempts: row.attempts + 1,
    lastError: error,
  })
}

export async function queueSize(): Promise<number> {
  const db = await getDb()
  return db.count('queue')
}

// ----------------------------------------------------------------- session

export async function saveSession<T>(key: string, value: T) {
  const db = await getDb()
  await db.put('session', { key, value, updatedAt: Date.now() })
}

export async function loadSession<T>(key: string): Promise<T | null> {
  const db = await getDb()
  const row = await db.get('session', key)
  return (row?.value as T) ?? null
}

export async function clearSession(key: string) {
  const db = await getDb()
  await db.delete('session', key)
}

// ------------------------------------------------------------------- cache

export async function putCache<T>(key: string, value: T) {
  const db = await getDb()
  await db.put('cache', { key, value, updatedAt: Date.now() })
}

export async function getCache<T>(
  key: string,
  maxAgeMs = Infinity,
): Promise<T | null> {
  const db = await getDb()
  const row = await db.get('cache', key)
  if (!row) return null
  if (Date.now() - row.updatedAt > maxAgeMs) return null
  return row.value as T
}
