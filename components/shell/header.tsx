'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { cn } from '@/lib/utils/cn'

/**
 * Sticky screen header on a blurred material. Title is centred and truncates
 * rather than wrapping — a two-line header shifts everything below it.
 */
export function Header({
  title,
  back,
  trailing,
  className,
}: {
  title?: string
  back?: boolean
  trailing?: React.ReactNode
  className?: string
}) {
  const router = useRouter()

  return (
    <header
      className={cn(
        'material-thin border-separator pt-safe sticky top-0 z-20 border-b',
        className,
      )}
    >
      <div className="mx-auto flex h-11 max-w-[480px] items-center gap-2 px-2">
        <div className="flex min-w-11 justify-start">
          {back && (
            <button
              onClick={() => router.back()}
              aria-label="Back"
              className="text-accent flex size-11 touch-manipulation items-center justify-center"
            >
              <ChevronLeft size={26} strokeWidth={2.2} />
            </button>
          )}
        </div>

        {title && (
          <h1 className="text-headline flex-1 truncate text-center">{title}</h1>
        )}

        <div className="flex min-w-11 justify-end">{trailing}</div>
      </div>
    </header>
  )
}
