import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { TEMPLATES } from '@/data/templates'

/**
 * First step of creating a routine.
 *
 * A blank editor is a worse starting point than an approximately right plan:
 * adjusting four exercises is easy, picking six from a library of 115 with no
 * anchor is not.
 */
export function TemplatePicker() {
  return (
    <main className="flex flex-col gap-5 px-5 pt-safe">
      <header className="pt-4">
        <h1 className="text-title-1">New routine</h1>
        <p className="text-subhead text-text-secondary">
          Start from a template, or build it yourself.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {TEMPLATES.map((template) => (
          <Link key={template.id} href={`/routines/new?template=${template.id}`}>
            <Card interactive className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-title-3">{template.name}</h2>
                <p className="text-footnote text-text-secondary">
                  {template.description} · {template.exercises.length} exercises
                </p>
              </div>
              <ChevronRight size={18} className="text-text-tertiary" />
            </Card>
          </Link>
        ))}

        <Link href="/routines/new?template=empty">
          <Card interactive className="flex items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-title-3">Start empty</h2>
              <p className="text-footnote text-text-secondary">
                Pick every exercise yourself
              </p>
            </div>
            <ChevronRight size={18} className="text-text-tertiary" />
          </Card>
        </Link>
      </div>
    </main>
  )
}
