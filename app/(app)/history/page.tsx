import { Construction } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { Header } from '@/components/shell/header'

/** Placeholder until Phase 5. Real screen spec is in docs/05-screens.md. */
export default function HistoryPage() {
  return (
    <>
      <Header title="History" />
      <EmptyState
        icon={Construction}
        title="Coming in Phase 5"
        description="Monthly calendar of frequency and volume"
      />
    </>
  )
}
