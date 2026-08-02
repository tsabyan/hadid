'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Anonymous-first auth.
 *
 * A user gets a real `auth.uid()` and a real profile row the moment they tap
 * Get Started — no email, no password, no paywall before any value is shown.
 * Everything they log belongs to that identity, and upgrading later links the
 * same user rather than migrating data between two.
 *
 * Requires "Anonymous sign-ins" to be enabled in the Supabase dashboard.
 */
export async function ensureSession() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) return session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error

  return data.session
}

/**
 * Upgrades an anonymous account to an email one.
 *
 * `updateUser` on the existing anonymous user keeps the same `auth.uid()`, so
 * every workout, record, and badge carries over untouched. Calling
 * `signUp` instead would create a second user and orphan the history — the
 * single most expensive mistake available in this flow.
 */
export async function linkEmail(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ email })
  if (error) throw error
}

export async function signInWithMagicLink(email: string, redirectTo: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

export async function isAnonymous() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.is_anonymous ?? false
}
