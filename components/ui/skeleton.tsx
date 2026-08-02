import { cn } from '@/lib/utils/cn'

/**
 * Loading placeholder. Must be given the exact dimensions of the content it
 * stands in for — a skeleton that is the wrong height causes the layout shift
 * it was meant to prevent.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('bg-sunken animate-pulse rounded-md', className)}
      {...props}
    />
  )
}
