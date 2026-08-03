import { Construction } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { Header } from '@/components/shell/header'

/** Placeholder until Phase 5. Real screen spec is in docs/05-screens.md. */
export default function InsightsPage() {
  return (
    <>
      <Header title="Insights" />
      <EmptyState
        icon={Construction}
        title="Coming in Phase 5"
        description="Volume charts, PRs, and muscle load"
      />
    </>
  )
}
