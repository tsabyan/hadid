import { CloudOff } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'

export const metadata = { title: 'Offline — Hadid' }

/**
 * Served by the service worker when a navigation fails and no cached copy of
 * that route exists.
 *
 * Says what is true — the data is safe locally — rather than the usual
 * "check your connection", which is both obvious and unhelpful to someone
 * standing in a basement who already knows.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <EmptyState
        icon={CloudOff}
        title="You're offline"
        description="Anything you logged is saved on this device and will sync by itself once you're back on a network."
      />
    </main>
  )
}
