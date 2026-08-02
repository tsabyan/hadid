# 06 — Setup & Deployment ($0)

Everything here runs on free tiers. No credit card required for either service.

> Free-tier limits change. The numbers below were accurate as of this document's writing — verify against Vercel and Supabase pricing pages before relying on any specific figure.

## 1. Accounts

| Service | Plan | Cost | What it gives you |
|---------|------|------|-------------------|
| GitHub | Free | $0 | Repo + CI trigger |
| Vercel | Hobby | $0 | Hosting, edge network, HTTPS, preview deploys |
| Supabase | Free | $0 | Postgres, Auth, Storage, generated types |

## 2. Local setup

Already done in Phase 0. For reference, the scaffold was:

```bash
npx create-next-app@latest . \
  --typescript --tailwind --app --eslint --no-src-dir \
  --import-alias "@/*" --use-npm --turbopack

npm i @supabase/supabase-js @supabase/ssr \
      motion @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers \
      zustand idb date-fns zod react-hook-form @hookform/resolvers \
      lucide-react @radix-ui/react-dialog @radix-ui/react-tabs \
      @radix-ui/react-slider @radix-ui/react-switch \
      @tanstack/react-virtual clsx tailwind-merge
```

Day to day:

```bash
npm run dev        # Turbopack dev server on :3000
npm run check      # typecheck + lint + build, same as CI
```

### A note on `npm audit`

`npm audit` reports high-severity advisories in `postcss` and `sharp`. Both are transitive dependencies **inside `next` itself**, not direct dependencies, and `npm audit fix --force` "resolves" them by downgrading Next to 9.3.3. Do not run it. These clear when Next ships updated bundled deps.

## 3. Supabase project

**This app shares an existing Supabase project** with the Pomodoro app rather than creating a second one. The free tier allows two active projects, and a shared instance means one thing to keep awake and one set of credentials to rotate.

Sharing a database only works because neither app uses the `public` schema:

| App | Schema |
|-----|--------|
| Pomodoro | `sukun` |
| This app | `hadid` |

Both define a `profiles` table and an `achievements` table. In `public` they would collide, and the collision would surface as a confusing RLS failure rather than an obvious error.

### Applying SQL

No Supabase CLI, no Docker. Migrations are run by hand:

1. Open the project → **SQL Editor** → New query
2. Paste the contents of `supabase/migrations/NNNN_*.sql`, in numeric order
3. Run

Every migration is written to be idempotent (`if not exists`, `drop … if exists` before create), so re-running one is safe.

### Expose the schema

Dashboard → **Settings → API → Exposed schemas** → add `hadid`.

Without this, PostgREST does not know the schema exists and **every query returns 404** regardless of grants or RLS. This is the single most likely thing to go wrong in setup.

### Generating types

There is no linked CLI, so regenerate after each migration via the dashboard: **API Docs → Generate types → TypeScript**, then paste over `types/database.ts`. Make sure the generator is pointed at the `hadid` schema, not `public`.

### Enable anonymous sign-in

Dashboard → **Authentication → Providers → Anonymous sign-ins → Enable**.

This is what makes zero-friction entry possible. Anonymous users count toward MAU, so also turn on **Auth → Settings → automatic cleanup of unconfirmed/anonymous users** if you get anywhere near the limit — for a personal or small-audience app you will not.

### Auth redirect URLs

Dashboard → **Authentication → URL Configuration**:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`, `https://*-yourname.vercel.app/**` (preview deploys), `http://localhost:3000/**`

Missing preview URLs here is the single most common cause of "magic link works locally, breaks in production".

## 4. Environment variables

`.env.local` (git-ignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SUPABASE_SCHEMA=hadid
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # server only — never NEXT_PUBLIC_
CRON_SECRET=<openssl rand -hex 32>
```

`.env.example` is committed with the keys and empty values so the next person knows what is needed. `lib/env.ts` validates these with zod at import time, so a missing variable fails the build with a readable message instead of surfacing as a 401 three screens in.

**The anon key is public by design** — it ships in the browser bundle. RLS is the security boundary, not key secrecy. The service role key bypasses RLS entirely; it belongs only in Vercel's server-side environment and must never appear in a Client Component, a `NEXT_PUBLIC_` variable, or the repo.

## 5. Deploy to Vercel

Repo: `git@github.com:tsabyan/hadid.git`.

```bash
git push -u origin main
```

Then at [vercel.com/new](https://vercel.com/new): import the repo, add the env vars (Production + Preview + Development), deploy. Next.js is auto-detected; no build config needed.

From then on: push to `main` deploys production, any other branch gets a preview URL.

## 6. Keeping Supabase awake

Free-tier Supabase projects **pause after ~7 days with no activity**. A paused project has to be manually restored from the dashboard, which for a personal app means opening it one Saturday and finding it dead.

Fix with a daily ping. `app/api/keepalive/route.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { error } = await supabase.from('achievements').select('id').limit(1)
  return Response.json({ ok: !error, error: error?.message })
}
```

`vercel.json`:

```json
{
  "crons": [{ "path": "/api/keepalive", "schedule": "0 6 * * *" }]
}
```

Vercel Hobby allows a limited number of cron jobs at **once-daily** frequency, which is exactly enough — daily beats a 7-day timeout with wide margin. Vercel sends the `CRON_SECRET` as a bearer token automatically when the env var is set.

If you'd rather not spend a Hobby cron slot, a GitHub Actions workflow on a schedule does the same job for free, with the caveat that GitHub disables scheduled workflows on repos with no activity for 60 days.

## 7. PWA setup

`app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hadid — Workout Tracker',
    short_name: 'Hadid',
    description: 'Your personal strength tracker',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FBFAF9',
    theme_color: '#FBFAF9',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

In `app/layout.tsx`:

```tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#1C1A19' },
  ],
}
```

Plus `<meta name="apple-mobile-web-app-capable" content="yes">` and `apple-touch-icon` links — iOS still reads those rather than the manifest for home-screen installs.

**iOS PWA limitations worth knowing before you design around them:**
- No push notifications unless the app is installed to the home screen (iOS 16.4+)
- No Vibration API at all
- Background timers stop when the tab is backgrounded — hence timestamp-derived timers
- ~50MB IndexedDB soft cap, and storage can be evicted after ~7 days of non-use unless the site is installed
- No install prompt — users must use Share → Add to Home Screen, so ship a one-time hint

## 8. Free-tier limits and what actually binds

**Vercel Hobby** — 100GB bandwidth/month, 100 GB-hours of function execution, unlimited static requests, **non-commercial use only**. If this app ever charges money, Hobby stops being the right plan.

**Supabase Free** — 500MB database, 5GB egress/month, 1GB file storage, 50,000 MAU, 2 active projects, pauses after ~7 days idle, no automatic backups.

**What binds first, realistically:**

Sets are the only table that grows meaningfully. A row is roughly 100 bytes with index overhead. A heavy user logging 30 sets a day produces ~11k rows a year — about 1MB. **500MB is thousands of user-years.** Database size will not be your problem.

Egress is the one to watch, and it's dominated by the app shell, not by data. Cache aggressively in the service worker, keep the bundle small, and 5GB is generous.

**No automatic backups on the free tier.** This matters more than any size limit — a year of training history has real personal value. Mitigate: a weekly `pg_dump` via GitHub Actions committed to a private repo or pushed to release artifacts, plus the in-app JSON export. Do this before you have data worth losing, not after.

## 9. CI

`.github/workflows/ci.yml` — on push and PR: `npm ci`, `tsc --noEmit`, `eslint`, `next build`. GitHub Actions is free for public repos and has a generous monthly allowance for private ones.

Optional and worth it: `lhci autorun` on the built app with a budget asserting LCP < 1.8s and the main bundle under 180KB, failing the build on regression. Performance budgets that aren't enforced are wishes.

## 10. Cost ceiling

Two paid upgrades exist if the app outgrows free:
- Supabase Pro — ~$25/mo: no pausing, daily backups, 8GB database
- Vercel Pro — ~$20/mo: commercial use, more bandwidth, better analytics

Neither is needed for a personal tracker or a small group of users. Design the app so migrating is a plan change and not a rewrite — which it is, since nothing here depends on a proprietary feature of either free tier.
