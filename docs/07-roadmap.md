# 07 — Build Roadmap

Eight phases. Each ends with something deployable. The order is deliberate: the data model and the design tokens come before any screen, because retrofitting either one costs more than building them twice.

---

## Phase 0 — Foundation

**Goal:** an empty but correct app deployed to a live URL.

- [x] `create-next-app`, dependencies, `tsconfig` strict
- [x] Supabase project — shares the existing project; owns the `hadid` schema
- [x] Env vars locally and in Vercel (Production + Preview + Development)
- [ ] Deployed to Vercel, custom subdomain set *(needs dashboard access)*
- [x] CI workflow: typecheck, lint, build
- [x] `.env.example` committed

**Done when:** a push to `main` produces a live deploy and CI is green.

---

## Phase 1 — Design system

Build this before any screen. Every screen after is assembly.

- [x] Design tokens in `globals.css` — colour, type, spacing, radii, shadows, both themes
- [x] Tailwind v4 theme mapped to the CSS variables
- [ ] Fonts: system stack is live; self-hosted Inter var fallback still to add
- [x] Motion presets in `lib/motion.ts`
- [x] `components/ui/`: Button · Card · Sheet · Segmented · Chip · Stepper · ListRow · ProgressRing · Skeleton · EmptyState · StatCard
- [x] App shell: tab bar, header, safe-area handling, theme switcher
- [x] A `/dev/components` gallery route rendering every component in every state and both themes

**Done when:** the gallery route passes the section 10 checklist in the design system doc, in both themes, with reduced-motion on and off.

The gallery route is not optional. Without it, component states get discovered in production.

---

## Phase 2 — Data layer

- [x] Migrations `0001`–`0011` written
- [x] RLS policies on every table, verified against the live database with two anonymous sessions
- [x] Seed data: 18 muscle groups, 115 exercises, 295 muscle mappings, 24 badges — generated from `data/*.ts`
- [x] `types/database.ts` — hand-written to match the migrations; regenerate from the dashboard after any schema change
- [x] Supabase clients: browser, server, proxy
- [x] `lib/db/queries.ts` and `lib/db/mutations.ts` typed
- [x] Anonymous auth working end to end, verified against the live project
- [x] Calc modules with unit tests: `volume` · `prs` · `streaks` · `muscle-load` · `units` (32 tests)

**Done when:** two anonymous sessions cannot see each other's data — tested, not assumed — and the calc functions pass their tests. ✅

`npm run verify:db` is that test. It found three defects that typecheck, lint, and vitest could not see:

1. `array_to_string` is STABLE, so the `search_vector` generated column was rejected outright.
2. Both `RETURNS TABLE` functions raised `42702 column reference is ambiguous` — the output parameters are named after the columns they carry.
3. `detect_prs` was callable by any authenticated user. Postgres grants EXECUTE to PUBLIC on every new function, so revoking from `anon, authenticated` by name did nothing. Since the function is `security definer` and writes records for whoever owns the workout, only the ambiguity bug was preventing a write into another user's history.

None of these were visible without a real Postgres. Run it after any schema change.

---

## Phase 3 — Core loop

The smallest thing that is actually useful: create a routine, run it, see it in history.

- [x] Onboarding (Screen 01)
- [x] Dashboard shell with real stats (Screen 02)
- [x] Add Exercise with search and filters (Screen 03) — built as a sheet, not a route
- [x] Edit Routine with drag-to-reorder (Screen 04)
- [x] Active Workout with set logging and the rest timer (Screen 05)
- [x] `finish_workout()` wired to the summary sheet

**Done when:** you can complete a real workout at the gym, on your phone, and the data is correct afterward. Do this before writing another line — a week of real use will change several assumptions in these docs.

---

## Phase 4 — Offline & PWA

Comes right after the core loop, because a logger that fails on bad signal is not a logger.

- [ ] IndexedDB store and write queue
- [ ] Optimistic mutations with queued replay on reconnect
- [ ] Service worker: app shell precache, stale-while-revalidate for data
- [ ] Manifest, icons, splash screens, iOS meta tags
- [ ] Active workout survives reload, backgrounding, and force-quit
- [ ] Wake Lock during a session
- [ ] Sync indicator in the header
- [ ] Add-to-home-screen hint on iOS Safari, shown once

**Done when:** airplane mode for a full workout, then reconnect — every set arrives, nothing duplicates.

---

## Phase 5 — Analytics screens

- [ ] Anatomy SVG component: front/back, group IDs matching `muscle_groups.svg_group`
- [ ] Heat-map tinting from activation-weighted volume
- [ ] History Calendar (Screen 06)
- [ ] Volume bar chart + trend line, hand-written SVG
- [ ] Insights (Screen 07)
- [ ] PR detection surfaced in the banner and the finish sheet

**Done when:** charts render correctly for a week, a month, an empty period, and a single-workout period. Off-by-one week boundaries are the usual bug here — test `week_starts_on` both ways.

---

## Phase 6 — Achievements

- [ ] 24 badges defined in both `badges.config.ts` and the `achievements` table
- [ ] `evaluate_achievements()` running on workout finish
- [ ] Badge grid, filters, progress (Screen 08)
- [ ] Detail sheet with unlock criteria
- [ ] Unlock animation in the workout summary
- [ ] Backfill: evaluating against existing history unlocks correctly for a user who already has data

**Done when:** a user with 50 historical workouts sees the right badges unlocked, not zero.

---

## Phase 7 — Polish

- [ ] Settings: units, theme, default rest, week start, JSON export, delete account
- [ ] Account upgrade: anonymous → email magic link or Google OAuth, preserving all data
- [ ] Every empty, loading, error, and offline state designed and implemented
- [ ] Accessibility pass: keyboard-only run, VoiceOver on iOS, contrast audit both themes
- [ ] Performance pass: bundle analysis, lazy-load the anatomy SVG and charts, virtualize long lists
- [ ] Reduced-motion path verified on every screen
- [ ] Weekly `pg_dump` backup workflow

**Done when:** Lighthouse mobile ≥ 95 across Performance, Accessibility, and Best Practices, and a full keyboard-only workout is possible.

---

## Phase 8 — Real-use hardening

After two weeks of daily use, expect this list to write itself. Likely candidates:

- Plate-math helper — what to load on the bar for a target weight
- Bodyweight-exercise handling (added load vs. reps only)
- Superset flow in the active logger
- Per-exercise notes and form cues
- Rest-timer presets per exercise type
- Week-over-week progression suggestions

Do not build any of these before Phase 3 ships and you've used the app for real. Feature intuition before daily use is guesswork; after it, it's evidence.

---

## Sequencing rules

1. **Design system before screens.** Retrofitting tokens across eight screens costs three times what building them first does.
2. **Data model before UI.** Schema changes ripple into every query, type, and component.
3. **Offline right after the core loop**, not at the end. Bolted-on offline means rewriting every mutation.
4. **Ship Phase 3, then use it for a week** before continuing. Everything after that phase is easier to prioritise with real data in the database.
5. **One screen at a time, fully finished** — including empty, error, and offline states. Eight half-finished screens is not 80% of an app; it's zero shippable screens.

## Effort shape

Phases 1 and 2 are the largest and least visible — a tokens file and a schema produce no screenshots. That is normal and it is where the quality of everything downstream is decided. Phase 3 is where the app suddenly appears to exist, and it will feel fast precisely because of the work in 1 and 2.
