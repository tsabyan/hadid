import { Construction } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { Header } from '@/components/shell/header'

/** Placeholder until Phase 6. Real screen spec is in docs/05-screens.md. */
export default function BadgesPage() {
  return (
    <>
      <Header title="Badges" />
      <EmptyState
        icon={Construction}
        title="Coming in Phase 6"
        description="24 badges across milestones, volume, and strength"
      />
    </>
  )
}
