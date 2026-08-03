import { TabBar } from '@/components/shell/tab-bar'

/**
 * Shell for every signed-in screen.
 *
 * Capped at 480px and centred: on a desktop this stays a phone-shaped column
 * rather than stretching a one-handed layout across a monitor. The bottom
 * padding clears the fixed tab bar, which would otherwise sit on top of the
 * last row of every scrollable list.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-[480px] flex-1 pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <TabBar />
    </div>
  )
}
