'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'

import { cn } from '@/lib/utils/cn'
import { spring } from '@/lib/motion'

/**
 * Bottom sheet. Radix handles focus trapping, scroll locking, and the escape
 * key; motion handles presentation and drag-to-dismiss.
 *
 * Dismiss threshold is distance **or** velocity: a slow drag past 40% of the
 * sheet height closes it, and so does a fast flick that barely moved. Distance
 * alone makes a confident flick feel ignored.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/28 backdrop-blur-[8px]"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={spring.gentle}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120 || info.velocity.y > 500) {
                    onOpenChange(false)
                  }
                }}
                className={cn(
                  'bg-raised fixed inset-x-0 bottom-0 z-50',
                  'max-h-[90dvh] overflow-y-auto overscroll-contain',
                  'rounded-t-2xl pb-safe shadow-xl',
                  className,
                )}
              >
                {/* Grab handle. Also the drag target users aim for. */}
                <div className="flex justify-center pt-2.5 pb-1">
                  <div className="bg-text-tertiary/30 h-1 w-9 rounded-full" />
                </div>

                <div className="px-5 pt-2 pb-6">
                  <Dialog.Title className="text-title-2">{title}</Dialog.Title>
                  {description ? (
                    <Dialog.Description className="text-subhead text-text-secondary mt-1">
                      {description}
                    </Dialog.Description>
                  ) : (
                    // Radix warns without a description; hiding it keeps the
                    // a11y contract without forcing copy onto every sheet.
                    <Dialog.Description className="sr-only">
                      {title}
                    </Dialog.Description>
                  )}
                  <div className="mt-4">{children}</div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
