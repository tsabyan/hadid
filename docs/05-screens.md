# 05 — Screen Specs

Each screen lists: route, layout, components, data, interactions, and states. Every screen must define its empty / loading / error / offline behaviour before it counts as done.

Global chrome: a 5-item bottom tab bar (Home · History · Insights · Badges · Settings) using `material-thin`, hidden during an active workout so nothing competes with the logger.

---

## Screen 01 — Onboarding

**Route** `/welcome` · client component · no tab bar

**Layout** (top → bottom)
1. App mark — a rounded-square logo, 72px, `--shadow-lg`
2. `display` headline: "Welcome to Hadid"
3. `callout` subtitle in `--text-secondary`: "Your personal strength tracker"
4. Three swipeable value cards
5. Page dots
6. Primary CTA `Get Started →`, full-width, 52px
7. `Skip` ghost link below

**Value cards** — each is a `--surface` card with a soft accent-tinted gradient wash, a 24px line icon, a `headline` title, and a `subhead` line:
- *Log sets in seconds* — weight, reps, rest, one thumb
- *PRs tracked automatically* — every record, without bookkeeping
- *Streaks and micro-goals* — small wins that compound

**Interactions** — horizontal swipe with `drag="x"`, snap to the nearest card, `smooth` spring. Off-centre cards render at 92% scale and 60% opacity. Dots animate width, not colour.

**On CTA** — `supabase.auth.signInAnonymously()` → set `profiles.onboarded = true` → mirror to `localStorage` → `router.replace('/')`.

**States** — offline: still proceed, create a local profile and queue the anonymous sign-in. The first screen must never fail.

---

## Screen 02 — Dashboard

**Route** `/` · Server Component shell + client islands

**Layout**
1. Header — greeting by time of day, date in `subhead`, settings icon
2. Quick-stat row — three cards, horizontal scroll with snap
3. Segmented control: `Workouts` / `Routines`
4. Primary CTA — `Start Workout`, full-width tinted
5. Routine cards list
6. Warm-up section — collapsible, below the fold

**Quick stats**
| Card | Value | Sub |
|------|-------|-----|
| Streak | `12` | days · flame icon if ≥ 3 |
| This week | `8,240 kg` | volume · delta vs last week |
| Last workout | `2d ago` | routine name |

Server-rendered from `v_daily_volume`; hydrated from IndexedDB when offline. Never renders empty — a cached snapshot shows while fresh data streams in.

**Routine card** — name (`title-3`), `6 exercises · ~45 min`, last-performed in `footnote`, a 4px accent bar on the left if performed this week. Tap starts a workout; overflow menu offers Edit / Duplicate / Archive.

**Warm-up list** — collapsible section header `Today's warm-up · 0/5`. Each row: exercise name, target (`1 × 10`), a `mm:ss` countdown in `--font-numeric`, play/reset, and a checkbox. Completion state persists per day in `localStorage`.

**States**
- Empty → "Create your first routine" card plus three starter templates
- Loading → skeleton cards matching final dimensions exactly, so nothing shifts
- Offline → a small dot in the header; everything still renders from cache

---

## Screen 03 — Add Exercise

**Route** `/exercises/add?routineId=…` · full-screen modal, client

**Layout**
1. Header — `✕` close, "Add", selection count badge
2. Segmented: `Exercise` / `Routine`
3. Search field — rounded-full, `--surface-sunken`, magnifier icon, clear button
4. Filter chips — horizontal scroll: All · Chest · Back · Legs · Shoulders · Arms · Core
5. `+ Create Custom Exercise` — pinned first row
6. Section header `FROM LIBRARY · 21` in `overline`
7. Virtualized result list
8. Sticky footer `Continue →`, disabled until ≥1 selection

**Result row** — 64px: a 32px SVG muscle icon on the left, name (`headline`), `Chest · Barbell` (`footnote`), type tag right-aligned in `caption`. Selected rows show an accent checkmark and an `--accent-soft` fill.

**Search** — 150ms debounce, matches name and aliases, normalized and diacritic-insensitive. Ranking: exact prefix > word prefix > substring > alias. Runs entirely against the bundled dataset — no network, instant.

**Custom exercise sheet** — name, muscle group picker (multi, with primary/secondary), equipment picker, optional default rest. Saves with `user_id = auth.uid()` and appears in the list immediately.

**States** — no results → "No exercises match '{query}'" plus a `Create "{query}"` tinted button, which is a better outcome than an empty list.

---

## Screen 04 — Edit Routine

**Route** `/routines/[id]/edit` · client

**Layout**
1. Header — `✕`, "Edit Routine", trash
2. Routine name — inline-editable text field
3. Exercise list — draggable
4. `+ Add exercise`
5. Sticky footer — `New version` (secondary) · `Save version` (primary)

**Exercise block** (a card per exercise)
- Header row: drag handle, position number, name, warm-up tag, collapse chevron, remove `✕`
- Set rows when expanded: set number, `− weight +` stepper, `− reps +` stepper, remove
- `+ Add set` ghost row
- Footer: `REST  − 90s +` and a *Superset with next* toggle

**Drag** — `@dnd-kit` with a pointer sensor (8px activation distance so scrolling still works) and a keyboard sensor for accessibility. The dragged card lifts to `--shadow-lg` at `scale: 1.02`; the rest reflow with `layout` + `snappy`. Reorder auto-saves; structural edits wait for Save.

**Versioning** — if the routine has logged workouts, Save prompts: *Update this routine* (new version, history preserved) or *Save as new routine*. If there is no history, Save commits in place with no prompt. Never make the user think about versions before there is anything to protect.

**Templates** — a new routine opens a template picker sheet: Push / Pull / Legs · Upper / Lower · Full Body · Start Empty.

---

## Screen 05 — Active Workout

**Route** `/workout/[id]` · client · tab bar hidden

The most important screen. Every other one can be a little slow. This one cannot.

**Layout**
1. Header — collapse chevron, exercise name, `SET 2` in `overline`, info + delete icons
2. Muscle heat map — front/back anatomy SVG, ~180px tall
3. `LAST 3 SESSIONS · TAP A SET TO REUSE` — horizontal history strip
4. `TODAY · n SETS` — completed sets list
5. Current set card
6. Rest timer bar — pinned bottom
7. Exercise pager — swipe or a bottom sheet exercise list

**Heat map** — muscles tinted from the `--heat-*` ramp by activation weight for the current exercise. Cross-fades between exercises (`smooth`). Lazy-loaded, since the SVG is the largest asset on the screen.

**History strip** — one chip per past session: date, `135 × 6`. Tap prefills the current set. This single feature removes most of the typing from a workout.

**Completed set row** — set number, weight, reps, a green check, RPE if entered. Long-press to edit or delete.

**Current set card** — the visual anchor: `--surface` at `--shadow-md`, `--radius-xl`, an `--accent` left bar. Contains `WEIGHT (KG)` and `REPS` steppers side by side, quick chips `+1 +2.5 +5`, a `Last: 40kg × 6` reference line, a `Warmup` toggle, and a large accent check button to complete.

**Rest timer** — appears on set completion. `1:45` at `title-1` in `--font-numeric`, a progress ring, `Skip` and `+30s`. Derived from `endsAt` so backgrounding, screen lock, and reload cannot desync it. On completion: audio tone, vibration where supported, ring flashes `--success`, and an `aria-live` announcement.

**Finish** — `Finish Workout` in the header overflow → confirm sheet → calls `finish_workout()` → summary sheet showing duration, volume, sets, new PRs, muscles worked, and any newly unlocked badges. `Share` produces a rendered PNG via canvas.

**Resilience**
- Every set writes to IndexedDB before any network call
- Wake Lock API keeps the screen on during a session (`navigator.wakeLock`, with a re-acquire on visibility change)
- Reloading mid-workout restores exact state, including timer remainder
- A crashed or abandoned session is offered for recovery on next open

---

## Screen 06 — History Calendar

**Route** `/history` · Server Component + client grid

**Layout**
1. Header — `‹`, "Calendar", search
2. Segmented: `Exercises` / `Routines`
3. Month navigation — `‹  July 2026  ›`
4. Weekday header row (respects `week_starts_on`)
5. 7-column day grid
6. Selected-day summary card

**Day cell** — square, `--radius-md`, day number centred in `--font-numeric`. Background from the `--heat-*` ramp by that day's volume; text flips to white at `--heat-3` and above. Today gets a 2px `--accent` ring. Selected gets a filled accent. Rest days show a faint 3px centred dot — visible rhythm beats scattered blanks.

**Summary card** — "Sunday, July 12", `1 workout · 810 kg volume`, a front/back muscle map of what was trained, muscle-name chips, and a tappable list of the workouts.

**Interactions** — horizontal swipe changes month with a slide + fade; three months stay mounted for instant paging.

**States** — a month with no data shows the grid greyed with a single centred line: "No workouts in July." The grid still renders, because an empty calendar is still information.

---

## Screen 07 — Insights

**Route** `/insights` · Server Component, charts client-side

**Layout**
1. Header — `‹`, "Insights", share
2. Segmented: `Stats` / `Focus`
3. Range segmented: `Week` / `Month`
4. Period stepper — `‹ Jul 6 – Jul 12 ›`
5. Two metric cards
6. PR banner
7. Daily volume chart
8. Muscles trained map
9. Exercise breakdown list

**Metric cards** — `1,037` reps `↑ 576%`; `7` active days `↑ 40%`. Value in `--font-numeric` at `title-1`, delta as a tinted chip. Deltas versus the immediately preceding period of the same length.

**PR banner** — `--accent-soft` fill, trophy icon, "6 personal records this week!". Expands to a list of `Exercise · 100 kg × 5 · +5 kg`.

**Volume chart** — hand-written SVG. Bars per day, `--accent` fill with a rounded top, `--surface-sunken` track showing the maximum. A 1.5px trend line overlays it. Bars animate height on mount with a 30ms stagger. Tap a bar for a tooltip with exact volume and set count. Y-axis is implicit: label only the max, in `footnote`.

**Muscles trained** — front/back maps side by side, tinted by share of period volume, with a legend and text chips beneath. Colour alone is never the only channel.

**Exercise breakdown** — rows of exercise name, set count, total volume, and a proportional bar. Sorted by volume descending, top 8, with "Show all".

All aggregation reads the cached history in IndexedDB, so the whole screen works offline.

---

## Screen 08 — Achievements

**Route** `/achievements` · Server Component

**Layout**
1. Header — `‹`, "Achievements", `14/24`
2. Progress card — `58%` with a bar and "Keep training to earn more"
3. Filter chips: All · Milestones · Volume · Strength
4. Grouped badge grids, three columns

**Badge tile** — square, `--radius-lg`, `--surface`, `--shadow-sm`. Contains a 32px icon, a `caption` name, and a `footnote` progress fraction.
- **Unlocked** — full colour, subtle accent-tinted gradient wash, 1px `--accent` border at 30%
- **Locked** — greyscale at 40% opacity, a small lock glyph bottom-right, progress `113 / 150`

**Group header** — `overline` label with a `4/5` count on the right.

**Detail sheet** — tap any badge: large icon, name, description, unlock criteria, a progress bar with the exact fraction, and the unlock date if earned.

**Unlock animation** — fires from the workout summary, not on this screen: tile scales 0.6→1 with `bouncy`, a radial `--accent` glow blooms and fades over 900ms, success haptic. No confetti. No full-screen takeover. Restraint is the whole point of the design language, and the badge screen is where it's most tempting to break it.

**States** — nothing unlocked yet: all tiles locked with the first three milestones highlighted as "closest to unlocking", which turns an empty screen into a goal list.

---

## Cross-screen states

| State | Treatment |
|-------|-----------|
| Loading | Skeletons with exact final dimensions. Never a centred spinner |
| Empty | Icon + one line + one sentence + one action |
| Error | Inline card, plain-language message, a Retry button. Never a raw error string |
| Offline | Header dot + a one-line banner. All cached content stays interactive |
| Syncing | A small pulsing dot in the header, cleared when the write queue drains |
