/**
 * Which failures are worth retrying.
 *
 * This is the decision that keeps the queue from deadlocking. Replay is
 * strictly ordered, so one op that can never succeed blocks every op behind
 * it — a single constraint violation would freeze a whole workout's worth of
 * sets in local storage forever.
 *
 * Kept pure and dependency-free so it can be tested directly.
 */

export type QueueError = {
  message: string
  /** Postgres SQLSTATE, surfaced by PostgREST. */
  code?: string
  status?: number
}

export function isPermanent(error: QueueError): boolean {
  const code = error.code ?? ''

  // 22xxx data exception, 23xxx integrity violation. Identical input will
  // fail identically forever.
  if (code.startsWith('22') || code.startsWith('23')) return true

  // RLS denial. Retrying cannot grant permission.
  if (code === '42501') return true

  const status = error.status ?? 0

  // 408 and 429 are 4xx that explicitly mean "try again".
  if (status === 408 || status === 429) return false

  return status >= 400 && status < 500
}
