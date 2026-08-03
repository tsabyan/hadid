/**
 * Reconciling the server's view of a session with the device's.
 *
 * Kept pure and separate from the logger so it can be tested without a
 * browser: "every set arrives, nothing duplicates" is the acceptance
 * criterion for the whole offline phase, and it is decided here.
 */

export type MergeableSet = {
  id: string
  set_number: number
  weight_kg: number
  reps: number
  is_warmup: boolean
}

export type MergeableExercise = {
  id: string
  name: string
  position: number
  rest_seconds: number | null
  sets: MergeableSet[]
}

/**
 * Union by client-generated id.
 *
 * The server is authoritative for what synced; the local snapshot is
 * authoritative for what has not. Because both sides key on ids minted on the
 * device, a set that exists in both appears exactly once — which is what makes
 * this safe to run on every load, including after a partial sync.
 *
 * Local wins on conflict: if a set was edited offline after syncing, the
 * device holds the newer value and the queue is about to push it anyway.
 */
export function mergeSessions<T extends MergeableExercise>(
  fromServer: T[],
  local: T[],
): T[] {
  const byId = new Map(fromServer.map((exercise) => [exercise.id, exercise]))

  for (const localExercise of local) {
    const existing = byId.get(localExercise.id)

    if (!existing) {
      // Added offline; the server has never seen it.
      byId.set(localExercise.id, localExercise)
      continue
    }

    const sets = new Map(existing.sets.map((set) => [set.id, set]))
    for (const set of localExercise.sets) sets.set(set.id, set)

    byId.set(localExercise.id, {
      ...existing,
      sets: [...sets.values()].sort((a, b) => a.set_number - b.set_number),
    })
  }

  return [...byId.values()].sort((a, b) => a.position - b.position)
}
