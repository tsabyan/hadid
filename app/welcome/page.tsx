'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Flame, Timer, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ensureSession } from '@/lib/auth'
import { completeOnboarding } from '@/lib/db/mutations'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'

const CARDS = [
  {
    icon: Timer,
    title: 'Log sets in seconds',
    body: 'Weight, reps, rest. One thumb, between sets.',
  },
  {
    icon: TrendingUp,
    title: 'Records track themselves',
    body: 'Every PR caught automatically. No bookkeeping.',
  },
  {
    icon: Flame,
    title: 'Small wins compound',
    body: 'Streaks and micro-goals that reward showing up.',
  },
] as const

export default function WelcomePage() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      await ensureSession()
      await completeOnboarding()
      router.replace('/')
    } catch (cause) {
      // The first screen must never dead-end. Say what happened and let them
      // try again rather than leaving a spinner that resolved into nothing.
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not start a session. Check your connection and try again.',
      )
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-safe pb-safe">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Nudged up for the same reason the generated icon uses a small
              dy: the ink of ح sits low in its line box, so centring the box
              leaves the mark looking dropped. */}
          <div className="bg-accent text-accent-text flex size-[72px] items-center justify-center rounded-[20px] shadow-lg">
            <span className="translate-y-[-6%] text-[40px] leading-none font-bold">
              ح
            </span>
          </div>
          <h1 className="text-display">Hadid</h1>
          <p className="text-callout text-text-secondary">
            Your personal strength tracker
          </p>
        </div>

        <div className="w-full">
          <motion.div
            className="relative h-[168px] touch-pan-y"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60 || info.velocity.x < -400) {
                setIndex((i) => Math.min(CARDS.length - 1, i + 1))
              } else if (info.offset.x > 60 || info.velocity.x > 400) {
                setIndex((i) => Math.max(0, i - 1))
              }
            }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {CARDS.map((card, i) =>
                i === index ? (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={spring.smooth}
                    className={cn(
                      'bg-surface absolute inset-0 flex flex-col justify-center gap-3',
                      'rounded-xl p-6 shadow-md',
                      // A soft accent wash rather than a photo. Photography
                      // dates, and stock gym imagery fights the calm tone.
                      'bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface)]',
                    )}
                  >
                    <card.icon
                      size={26}
                      strokeWidth={1.8}
                      className="text-accent"
                    />
                    <h2 className="text-title-3">{card.title}</h2>
                    <p className="text-subhead text-text-secondary">
                      {card.body}
                    </p>
                  </motion.div>
                ) : null,
              )}
            </AnimatePresence>
          </motion.div>

          <div className="mt-5 flex justify-center gap-1.5">
            {CARDS.map((card, i) => (
              <button
                key={card.title}
                onClick={() => setIndex(i)}
                aria-label={`Go to card ${i + 1}`}
                className="p-2"
              >
                {/* Dots animate width, not colour — a size change reads at a
                    glance where a tint shift does not. */}
                <motion.span
                  animate={{ width: i === index ? 18 : 6 }}
                  transition={spring.snappy}
                  className={cn(
                    'block h-1.5 rounded-full',
                    i === index ? 'bg-accent' : 'bg-text-tertiary/35',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pb-6">
        {error && (
          <p className="text-footnote text-danger text-center">{error}</p>
        )}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={start}
          disabled={busy}
        >
          {busy ? 'Setting up…' : 'Get Started →'}
        </Button>
        <p className="text-footnote text-text-tertiary">
          No account needed. Nothing to sign up for.
        </p>
      </div>
    </main>
  )
}
