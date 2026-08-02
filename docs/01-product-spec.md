# 01 — Product Spec

## 1. What it is

A personal strength-training tracker on the web. The user builds routines, runs a live workout, logs sets, and watches volume/PRs/streaks accumulate over time.

Original concept was a React Native app (8 screens). This spec ports it to a **mobile-first web app** installable as a PWA, so it behaves like a native iOS app without an App Store account, a Mac, or a paid developer program.

## 2. Target user

A person who lifts 2–5× per week and currently logs in a notes app or a spreadsheet. They want structure without a subscription and without a social feed. They are on an iPhone in a gym, one-handed, often with poor signal.

Implications that drive every decision below:
- **One-handed reach** — primary actions live in the bottom third of the viewport.
- **Sweaty thumbs** — minimum 44×44px tap targets, generous spacing between destructive and routine actions.
- **Bad signal** — every write is optimistic and queued; nothing blocks on the network.
- **Short attention window between sets** — glanceable, no scroll hunting.

## 3. Scope — v1 screens

| # | Screen | Purpose |
|---|--------|---------|
| 1 | Onboarding | Value props, zero-friction entry, no forced sign-up |
| 2 | Dashboard | Quick stats, routines, today's warm-up list |
| 3 | Add Exercise | Search + filter the exercise library, or create a custom one |
| 4 | Edit Routine | Reorder exercises; edit sets, reps, weight, rest |
| 5 | Active Workout | Live set logger, rest timer, muscle heat map |
| 6 | History Calendar | Month grid of workout frequency + volume |
| 7 | Insights | Volume charts, PR tracker, per-muscle training load |
| 8 | Achievements | Badge grid across Milestones / Volume / Strength |

## 4. Feature detail

### 4.1 Onboarding
- Three swipeable value-prop cards: *Log sets in seconds* · *PRs tracked automatically* · *Build streaks, hit micro-goals*.
- Cards use soft gradient surfaces, not photography.
- Single primary CTA: **Get Started**. A quiet **Skip** text link bypasses the whole flow.
- On CTA: create a **Supabase anonymous session**, write `onboarded: true` to the profile, route to Dashboard.
- No email, no password, no paywall before value is shown.
- Shown once. Gate on the profile flag, with a `localStorage` mirror so the check is instant and never flashes.

### 4.2 Dashboard (home)
- **Quick-stat row**, pinned at top: current streak · this week's volume · last workout. Three cards, horizontally scrollable on small screens.
- **Segmented control**: `Workouts` / `Routines`.
- **Routine cards**: name, exercise count, estimated duration, last performed. Tap → start a workout from that routine. Long-press / overflow → edit.
- **Today's warm-up list**: collapsible, sits below the fold so it never pushes routines out of view. Each row has an independent countdown timer with play/reset, and a checkbox that persists for the day.
- **Empty state**: a "Create your first routine" card plus three starter templates (Push / Pull / Legs, Upper / Lower, Full Body).
- Stats recompute on mount and on window focus, but read from a cached snapshot first so the row never renders empty.

### 4.3 Add Exercise
- Full-text search over the exercise library (built-in + the user's custom exercises).
- Muscle-group filter chips, horizontally scrollable: All · Chest · Back · Legs · Shoulders · Arms · Core.
- Result rows: exercise name, `muscle group · equipment`, a small SVG muscle icon, and a type tag (`STRENGTH` / `CARDIO` / `MOBILITY`).
- Multi-select with a running count in the header; **Continue** commits all selections at once.
- **Create Custom Exercise** pinned to the top of the list, always reachable.
- Search matches names **and** aliases (`bench` → `Barbell Bench Press`; `OHP` → `Overhead Press`). Debounce 150ms, match on normalized lowercase, rank exact-prefix hits first.

### 4.4 Edit Routine
- Drag-to-reorder the exercise list (pointer events + `dnd-kit`, touch-friendly).
- Each exercise row expands to per-set editing: set number, target weight, target reps, and a per-exercise rest interval.
- Stepper inputs (`−` / `+`) with a tappable numeric field for direct entry. Weight steps by 2.5 (kg) or 5 (lb); reps step by 1. Long-press a stepper to accelerate.
- Mark any set as a **warm-up** set — excluded from volume and PR calculations.
- **Rest** rows sit between exercises with a *superset with next* toggle.
- **Starter templates** seed a new routine as a quick-start base.
- **Versioning**: editing a routine that already has logged history creates a new version rather than mutating the old one, so past workouts stay accurate. Buttons: `New version` (branch) and `Save version` (commit in place).
- Reorder auto-saves; structural edits (add/remove exercise, change sets) commit on **Save**. This avoids half-finished routines being persisted mid-edit.

### 4.5 Active Workout
- Header: exercise name, set indicator (`SET 2`), an info button (form notes) and a delete button.
- **Muscle heat map**: front/back anatomical SVG, current exercise's target muscles tinted by activation weight (primary = full accent, secondary = 40% accent).
- **Last 3 sessions** strip: tap any historical set to copy its weight/reps into the current set.
- **Current set card**: weight and reps steppers, quick-multiplier chips (`×1` `×2.5` `×5`), and a checkmark to complete the set.
- Completing a set starts the **rest timer** — a large countdown with a progress ring, `Skip`, and `+30s`. Default 120s, overridden per exercise.
- Rest timer end fires: `navigator.vibrate` (Android), a short Web Audio tone, and a Notification if permission was granted. iOS Safari does **not** support the Vibration API — the audio cue plus an on-screen flash covers it.
- Timer state is derived from a stored `endsAt` timestamp, not an interval counter — it survives tab backgrounding, screen lock, and reload.
- **Rest timer auto-starts after working sets only**, not warm-ups. Configurable.
- Workout finish → summary sheet: duration, total volume, sets, PRs hit, muscles worked.

### 4.6 History Calendar
- 7-column month grid. Each day cell is colour-coded by logged volume across four intensity buckets (none / light / moderate / heavy).
- Month navigation with swipe and chevrons. Today's cell has a ring.
- Tapping a day opens a summary card below: workouts, total volume, duration, and an anatomical SVG muscle map of what was trained.
- Rest days render as a faint dot rather than fully blank — the grid should read as a rhythm, not a scattering.
- Segmented control at top: `Exercises` / `Routines` view of the same month.

### 4.7 Insights
- Range selector: `Week` / `Month`, with `‹ ›` period stepping.
- **Headline metric cards**: total reps and active days, each with a percentage delta versus the previous period.
- **PR banner**: "6 personal records this week!" — tap to expand the list.
- **Daily volume**: hand-drawn SVG bar chart, Mon–Sun, with a trend line overlay.
- **Muscles trained**: front/back anatomical map weighted by recent per-muscle volume.
- **PR definition**: track both *max weight for any rep count* and *estimated 1RM* via Epley (`w × (1 + r/30)`). Display logged max weight as the headline; show estimated 1RM as a secondary line. Never present an estimate as a real lift.
- All aggregation runs client-side over cached history, so the screen works fully offline.

### 4.8 Achievements
- Badge grid grouped into three categories: **Milestones**, **Volume**, **Strength**. 24 badges in v1.
- Header shows overall progress (`14 of 24 unlocked`) with a progress bar.
- Filter chips: All · Milestones · Volume · Strength.
- Locked badges render greyed with a lock overlay and a progress fraction (`113 / 150`).
- Tapping any badge opens a bottom sheet with unlock criteria and current progress.
- Unlock evaluation runs after every workout is finished, server-side in a Postgres function, so it cannot be spoofed client-side and stays consistent across devices.
- Unlocking shows a **restrained** celebration: badge scales in, a soft radial glow, subtle haptic. No confetti, no full-screen takeover — that fights the calm tone.

## 5. Cross-cutting requirements

**Units** — kg/lb toggle in settings. Store everything in **kg** in the database; convert at the display layer only.

**Auth model** — anonymous by default. A persistent, dismissible banner offers "Save your progress" → email magic link or Google OAuth. Upgrading links the existing anonymous user, so no data migration is needed.

**Data ownership** — export all data as JSON from settings. It is the user's log.

**Accessibility** — WCAG AA contrast on all text, full keyboard operation, `prefers-reduced-motion` honoured (crossfades replace slides/springs), semantic landmarks, `aria-live` on the rest timer.

**Performance budget** — LCP < 1.8s on 4G, first interaction < 100ms, main bundle < 180KB gzipped, virtualized lists past 50 rows.

## 6. Non-goals for v1

Social feed / friends. Video demos. Apple Health or Google Fit sync. Nutrition. Wearable integration. Coach/trainer multi-user accounts. Paid tiers. Native App Store builds.

Each of these is a real product on its own. Shipping any of them at v1 costs the thing that makes this app good — that it is quiet and fast.
