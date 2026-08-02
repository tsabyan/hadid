import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

/**
 * Phase 0 placeholder. Replaced by the Dashboard in Phase 3.
 *
 * It exists to prove one thing end to end: the deployed app can reach Supabase
 * with the configured credentials. A green line here means env vars, the proxy
 * session refresh, and the server client are all wired correctly.
 */
export default async function Home() {
  const supabase = await createClient()
  const { error } = await supabase.auth.getClaims()

  const reachable = !error
  const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-8 px-5 py-16">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-[0.06em] uppercase opacity-50">
          Phase 0 · Foundation
        </p>
        <h1 className="text-[28px] leading-8 font-bold tracking-tight">
          Hadid
        </h1>
        <p className="text-[17px] leading-6 opacity-60">
          Scaffold is live. Design system lands in Phase 1.
        </p>
      </div>

      <dl className="flex flex-col gap-3 text-[15px]">
        <Row label="Supabase host" value={host} />
        <Row label="Schema" value={env.NEXT_PUBLIC_SUPABASE_SCHEMA} />
        <Row
          label="Auth reachable"
          value={reachable ? 'yes' : (error?.message ?? 'no')}
          ok={reachable}
        />
      </dl>
    </main>
  )
}

function Row({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-current/8 pb-3">
      <dt className="opacity-50">{label}</dt>
      <dd
        className={`tabular truncate font-medium ${ok === false ? 'text-red-600' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}
