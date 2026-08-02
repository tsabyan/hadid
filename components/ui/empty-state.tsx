import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

/**
 * Icon, one line, one sentence, one action. No illustrations — they date fast
 * and read as filler where a clear next step reads as help.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-8 py-12 text-center',
        className,
      )}
    >
      <Icon size={48} strokeWidth={1.5} className="text-text-tertiary" />
      <h3 className="text-title-3">{title}</h3>
      {description && (
        <p className="text-subhead text-text-secondary max-w-[36ch]">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
