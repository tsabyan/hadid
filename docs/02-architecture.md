# 02 — Architecture

## 1. Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16, App Router | Free Vercel hosting, RSC for the read-heavy screens, route handlers for server work |
| Language | TypeScript, `strict: true` | Schema types generate straight from Supabase |
| UI | React 19 | Server Components + `useOptimistic` for instant writes |
| Styling | Tailwind CSS v4 | CSS-variable theming, no runtime cost |
| Primitives | Radix UI | Accessible sheets, dialogs, tabs, sliders — unstyled |
| Motion | `motion` (Framer Motion successor) | Spring physics, layout animations, gesture handling |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Touch-first, accessible, small |
| Charts | Hand-written SVG | No library. Full control, ~0 bundle cost |
| Icons | `lucide-react` | Consistent 1.5px stroke, tree-shakeable |
| Database | Supabase Postgres | Free tier, RLS, generated types |
| Auth | Supabase Auth (anonymous → email/OAuth) | Zero-friction entry, upgradeable |
| Local cache | IndexedDB via `idb` | Offline reads + write queue |
| State | Zustand (client) + Server Components (server) | Small, no boilerplate, no provider pyramid |
| Forms | `react-hook-form` + `zod` | Shared validation schemas client and server |
| Dates | `date-fns` | Tree-shakeable, no moment-sized bundle |
| PWA | `next-pwa` or a hand-written service worker | Installable, offline shell |

> Deliberately not used: a charting library, a component kit like MUI, `react-query` (Server Components plus the local cache cover it), any analytics SDK.

### Next 16 differences that bite

`create-next-app` now scaffolds Next 16, and several conventions changed from the 15-era guides most examples are written against:

- **`middleware.ts` → `proxy.ts`**, at the project root, exporting a function named `proxy`. The runtime is always Node; `edge` is not supported and cannot be configured.
- **Async request APIs are mandatory.** `cookies()`, `headers()`, `draftMode()`, and `params`/`searchParams` in pages are async-only — the synchronous compatibility shim from 15 is gone. Every Supabase server client call must be awaited.
- **Turbopack is the default** for both dev and build.
- **`next lint` was removed** — ESLint runs directly via flat config.
- The scaffold ships an `AGENTS.md` pointing at `node_modules/next/dist/docs/`. That directory is the authoritative reference for this exact version; check it before trusting any external Next tutorial.

## 2. Rendering strategy

Everything is mobile-first and installed to the home screen, so the app behaves as a **client-heavy shell with server-rendered data boundaries**:

- **Server Components** — Dashboard stats, History, Insights, Achievements. These read the database directly with the server client and stream HTML.
- **Client Components** — Active Workout, Edit Routine, Add Exercise, Onboarding. Anything with fine-grained local state, drag, or a timer.
- **Server Actions** — every mutation. Called optimistically; the UI never awaits them before updating.
- **Route Handlers** — only where a webhook or a non-form endpoint is needed (export, cron ping).

## 3. Folder layout

```
workout-tracker/
├── app/
│   ├── (onboarding)/
│   │   └── welcome/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # tab bar, safe-area insets, providers
│   │   ├── page.tsx                # Dashboard
│   │   ├── routines/
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── exercises/add/page.tsx
│   │   ├── workout/[id]/page.tsx   # Active workout
│   │   ├── history/page.tsx
│   │   ├── insights/page.tsx
│   │   ├── achievements/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── export/route.ts
│   │   └── keepalive/route.ts      # cron pings Supabase to prevent pausing
│   ├── layout.tsx                  # html, fonts, theme colour, viewport-fit=cover
│   ├── manifest.ts
│   └── globals.css                 # design tokens
├── components/
│   ├── ui/                         # Button, Card, Sheet, Stepper, Segmented, Chip...
│   ├── charts/                     # VolumeBars, TrendLine, ProgressRing
│   ├── anatomy/                    # MuscleMap front/back SVG + heat mapping
│   └── features/                   # dashboard/, workout/, routine/, insights/...
├── proxy.ts                        # root: session refresh (was middleware.ts pre-16)
├── lib/
│   ├── env.ts                      # zod-validated env, fails the build not the request
│   ├── supabase/
│   │   ├── client.ts               # browser client
│   │   ├── server.ts               # RSC / Server Action client
│   │   └── proxy.ts                # session refresh helper
│   ├── db/
│   │   ├── queries.ts              # typed read functions
│   │   └── mutations.ts            # Server Actions
│   ├── offline/
│   │   ├── store.ts                # IndexedDB wrapper
│   │   └── queue.ts                # write queue + replay
│   ├── calc/
│   │   ├── volume.ts   prs.ts   streaks.ts   muscle-load.ts   achievements.ts
│   ├── stores/                     # Zustand: activeWorkout, timer, prefs
│   └── utils/                      # units, format, cn
├── data/
│   ├── exercises.seed.ts           # ~200 exercises
│   ├── badges.config.ts            # 24 badge definitions
│   └── templates.ts                # starter routines
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── types/database.ts               # generated
└── public/icons/                   # PWA icons, splash screens
```

## 4. Data flow

### Reads
```
RSC page  →  lib/db/queries.ts  →  Supabase (RLS-scoped)  →  streamed HTML
                                      ↓
Client components hydrate, then hydrate again from IndexedDB if offline
```

### Writes (the important path)
```
User taps "complete set"
   ↓  (0ms)   Zustand updates → UI reflects the change immediately
   ↓  (0ms)   IndexedDB append — durable before the network is touched
   ↓  (async) Server Action → Supabase
   ↓          success → mark synced        failure → stays queued, retries on reconnect
```

The UI never waits on the network. A queued write shows a small dot in the header; it clears when the queue drains. No spinners, no blocking toasts.

### Conflict handling
Single-user data with client-generated UUIDs, so conflicts are rare. Rule: **last-write-wins on `updated_at`**, except for `sets` — those are append-only and never merged. A set logged offline on two devices produces two sets, which is the honest outcome.

## 5. Offline strategy

| Concern | Approach |
|---------|----------|
| App shell | Service worker precaches routes, JS, CSS, fonts, icons |
| Exercise library | Bundled as static TS at build time — never needs a fetch |
| Recent history | Last 90 days mirrored into IndexedDB on load |
| Active workout | Lives in IndexedDB from the moment it starts; survives a hard reload |
| Writes | Append to a queue store, replay on `online` event and on app focus |
| Cache invalidation | `revalidateTag` on the server; IndexedDB mirror refreshed on focus |

Anything logged offline must survive a browser force-quit. That means IndexedDB, not memory and not `sessionStorage`.

## 6. State ownership

| State | Home | Notes |
|-------|------|-------|
| Auth session | Supabase client + cookie | Refreshed in `proxy.ts` |
| Active workout | Zustand, persisted to IndexedDB | Single source of truth mid-session |
| Rest timer | Zustand, `endsAt` timestamp | Derived, never a tick counter |
| Preferences (units, theme, rest default) | Zustand + `localStorage`, mirrored to `profiles` | Instant on load, synced across devices |
| Everything else | Server, fetched per request | No global cache to invalidate |

## 7. Security

- **RLS on every table**, no exceptions. The anon key is public by design; RLS is the actual boundary.
- The service role key lives **only** in Vercel server-side env. Never `NEXT_PUBLIC_*`, never in a Client Component.
- Achievement unlocks and PR detection run in Postgres functions (`security definer`) so the client can't fabricate them.
- Zod validation on every Server Action input — client validation is a UX affordance, not a control.
- CSP headers set in `next.config.ts`; no inline scripts other than the Next.js runtime.

## 8. Performance

- Route-level code splitting; the anatomy SVG and chart components load lazily.
- `next/font` with `display: swap`, self-hosted — no external font request.
- Virtualize any list past 50 rows (`@tanstack/react-virtual`).
- Aggregations (weekly volume, muscle load) precomputed in Postgres views, not recalculated in the browser from raw sets.
- Images: only badge art and icons. SVG or AVIF, all under 8KB.
