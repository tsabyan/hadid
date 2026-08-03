'use client'

/**
 * Non-visual feedback.
 *
 * iOS Safari has no Vibration API, so nothing here may be the only signal for
 * anything — every call site pairs these with a visible change. Audio is the
 * cue that actually works across platforms, which is why the rest timer ends
 * with a tone rather than a buzz.
 */

let context: AudioContext | null = null

/**
 * Must be called from a real user gesture. iOS refuses to start an
 * AudioContext otherwise, and a context created on page load is silent
 * forever with no error to explain why.
 */
export function unlockAudio() {
  if (context) return
  try {
    context = new AudioContext()
    if (context.state === 'suspended') void context.resume()
  } catch {
    context = null
  }
}

/** Soft sine with a short decay. A notification, not an alarm. */
export function chime(frequency = 660) {
  if (!context) return
  try {
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency

    const now = context.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.4)
  } catch {
    // An audio failure must never interrupt a workout.
  }
}

export const haptic = {
  light: () => navigator.vibrate?.(8),
  medium: () => navigator.vibrate?.(15),
  success: () => navigator.vibrate?.([10, 40, 10]),
}

/**
 * Keeps the screen awake mid-session. Returns a cleanup function, so it is
 * called from inside an effect rather than being a hook itself.
 *
 * Re-acquired on visibility change: the lock is dropped whenever the tab is
 * hidden, and coming back to a workout only for the screen to die two seconds
 * later is worse than never having held it.
 */
export function acquireWakeLock() {
  if (typeof window === 'undefined') return () => {}

  let sentinel: WakeLockSentinel | null = null
  let cancelled = false

  const acquire = async () => {
    if (cancelled) return
    try {
      sentinel = await navigator.wakeLock?.request('screen')
    } catch {
      // Denied, unsupported, or the document is not visible. Not worth
      // surfacing — the workout is unaffected.
    }
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') void acquire()
  }

  void acquire()
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    cancelled = true
    document.removeEventListener('visibilitychange', onVisible)
    void sentinel?.release()
  }
}
