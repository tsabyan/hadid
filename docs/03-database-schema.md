# 03 — Database Schema

Postgres on Supabase. Every table lives in the **`hadid`** schema — the project is shared with another app, so `public` is off limits (see doc 06, section 3). Every table has RLS enabled. All weights are stored in **kilograms**; unit conversion happens at the display layer only.

## 1. Entity overview

```
auth.users
    └── profiles (1:1)
            ├── exercises (custom only; built-ins have user_id = null)
            ├── routines
            │      └── routine_versions
            │             └── routine_exercises
            │                    └── routine_sets
            ├── workouts
            │      └── workout_exercises
            │             └── sets
            ├── personal_records
            └── user_achievements
```

Reference tables (no owner): `muscle_groups`, `exercise_muscles`, `achievements`.

## 2. Tables

### `profiles`
Extends `auth.users`. Created by trigger on signup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | FK → `auth.users(id)` on delete cascade |
| `display_name` | `text` | nullable |
| `unit_system` | `text` | `'metric'` \| `'imperial'`, default `'metric'` |
| `default_rest_seconds` | `int` | default `120` |
| `onboarded` | `boolean` | default `false` |
| `theme` | `text` | `'system'` \| `'light'` \| `'dark'` |
| `week_starts_on` | `int` | `0`=Sun, `1`=Mon; default `1` |
| `timezone` | `text` | IANA zone, default `'UTC'`. Captured at onboarding — streak day boundaries are wrong in an undebuggable way without it |
| `created_at` / `updated_at` | `timestamptz` | |

### `muscle_groups`
Reference data. Drives the anatomy SVG and the muscle-load charts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | `'chest'`, `'lats'`, `'quads'`… |
| `name` | `text` | Display name |
| `region` | `text` | `'upper'` \| `'lower'` \| `'core'` |
| `svg_group` | `text` | Matching `<g id>` in the anatomy SVG |
| `body_side` | `text` | `'front'` \| `'back'` \| `'both'` |

### `exercises`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `user_id` | `uuid` | `null` = built-in library; set = user's custom exercise |
| `slug` | `text` unique | Stable identity for built-ins, `null` for custom. The seed upserts on it, and the bundled client copy references it |
| `name` | `text` | |
| `aliases` | `text[]` | Search synonyms — `{bench, bp}` |
| `equipment` | `text` | `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `kettlebell`, `band`, `other` |
| `type` | `text` | `strength` \| `cardio` \| `mobility` |
| `is_unilateral` | `boolean` | default `false` |
| `default_rest_seconds` | `int` | nullable, falls back to profile default |
| `instructions` | `text` | nullable |
| `search_vector` | `tsvector` | generated, indexed GIN |
| `created_at` | `timestamptz` | |

### `exercise_muscles`
Join table. Weighting is what makes the heat map meaningful.

| Column | Type | Notes |
|--------|------|-------|
| `exercise_id` | `uuid` | FK, cascade |
| `muscle_group_id` | `text` | FK |
| `role` | `text` | `primary` \| `secondary` |
| `activation` | `numeric(3,2)` | `0.00`–`1.00`; primary ≈ 1.0, secondary ≈ 0.4 |

PK: `(exercise_id, muscle_group_id)`

### `routines`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | FK, cascade |
| `name` | `text` | |
| `notes` | `text` | nullable |
| `color` | `text` | accent tag, nullable |
| `archived_at` | `timestamptz` | nullable, soft delete |
| `created_at` / `updated_at` | `timestamptz` | |

### `routine_versions`
Editing a routine that already has logged history creates a new version, so past workouts keep referring to the structure they were actually performed with.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `routine_id` | `uuid` | FK, cascade |
| `version` | `int` | increments per routine |
| `is_current` | `boolean` | exactly one true per routine |
| `created_at` | `timestamptz` | |

Unique: `(routine_id, version)` · partial unique index on `(routine_id) where is_current`

### `routine_exercises`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `routine_version_id` | `uuid` | FK, cascade |
| `exercise_id` | `uuid` | FK |
| `position` | `int` | ordering |
| `rest_seconds` | `int` | nullable |
| `superset_with_next` | `boolean` | default `false` |
| `notes` | `text` | nullable |

Unique: `(routine_version_id, position)` — deferrable, so reordering can happen in a single transaction.

### `routine_sets`
Target values. The plan, not the record.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `routine_exercise_id` | `uuid` | FK, cascade |
| `set_number` | `int` | |
| `target_weight_kg` | `numeric(6,2)` | nullable |
| `target_reps` | `int` | nullable |
| `is_warmup` | `boolean` | default `false` |

### `workouts`
One training session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | client-generated, so offline sessions have stable IDs |
| `user_id` | `uuid` | FK, cascade |
| `routine_version_id` | `uuid` | nullable — ad-hoc workouts have none |
| `name` | `text` | snapshot of the routine name at the time |
| `started_at` | `timestamptz` | |
| `ended_at` | `timestamptz` | nullable — null means in progress |
| `duration_seconds` | `int` | generated on finish, excludes long pauses |
| `total_volume_kg` | `numeric(10,2)` | denormalized, maintained by trigger |
| `total_sets` | `int` | denormalized, maintained by trigger |
| `notes` | `text` | nullable |
| `created_at` | `timestamptz` | |

Index: `(user_id, started_at desc)`

### `workout_exercises`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `workout_id` | `uuid` | FK, cascade |
| `exercise_id` | `uuid` | FK |
| `position` | `int` | |
| `rest_seconds` | `int` | nullable |
| `notes` | `text` | nullable |

### `sets`
The atomic record. Append-only — never updated after a workout ends.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | client-generated |
| `workout_exercise_id` | `uuid` | FK, cascade |
| `set_number` | `int` | |
| `weight_kg` | `numeric(6,2)` | `0` for bodyweight |
| `reps` | `int` | |
| `is_warmup` | `boolean` | default `false` — excluded from volume and PRs |
| `rpe` | `numeric(3,1)` | nullable, `6.0`–`10.0` |
| `volume_kg` | `numeric(10,2)` | generated: `weight_kg * reps` |
| `completed_at` | `timestamptz` | |

Index: `(workout_exercise_id, set_number)`

### `personal_records`
Materialized rather than derived, so the PR banner is one indexed read.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | FK, cascade |
| `exercise_id` | `uuid` | FK |
| `record_type` | `text` | `max_weight` \| `max_reps` \| `max_volume` \| `est_1rm` |
| `value` | `numeric(10,2)` | |
| `reps` | `int` | nullable, context for `max_weight` |
| `set_id` | `uuid` | FK — the set that set the record |
| `achieved_at` | `timestamptz` | |
| `previous_value` | `numeric(10,2)` | nullable, powers "+5kg" deltas |

Unique: `(user_id, exercise_id, record_type, achieved_at)`
Index: `(user_id, achieved_at desc)`

### `achievements`
Static badge definitions. Reference data, mirrored in `data/badges.config.ts` for offline rendering.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | `'first_rep'`, `'century_club'` |
| `category` | `text` | `milestones` \| `volume` \| `strength` |
| `name` / `description` | `text` | |
| `icon` | `text` | emoji or icon key |
| `threshold` | `numeric` | target value |
| `metric` | `text` | `workouts_count`, `total_volume_kg`, `streak_days`, `sets_count`, `pr_count` |
| `sort_order` | `int` | |

### `user_achievements`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `uuid` | FK, cascade |
| `achievement_id` | `text` | FK |
| `unlocked_at` | `timestamptz` | |
| `progress` | `numeric` | current value toward the threshold |

PK: `(user_id, achievement_id)`

## 3. Views

**`v_daily_volume`** — per user per day: total volume, set count, workout count. Backs the calendar heat colouring and the Insights bar chart.

**`v_muscle_load`** — per user per day per muscle group: `sum(set.volume_kg * exercise_muscles.activation)`. Backs both heat maps.

**`v_workout_summary`** — a workout joined to its exercise names, set counts, and per-muscle totals. One read for the finish sheet and the calendar day card.

Keep these as plain views at first. Only promote to materialized views if the free-tier instance starts showing slow queries — materialized views need a refresh strategy, and that is complexity you do not want early.

All three are created `with (security_invoker = true)`. Without it a view executes as its owner and quietly bypasses the RLS on its base tables, handing every user everyone else's history — the most dangerous single line in the schema.

## 4. Row Level Security

Pattern, applied to every owned table:

```sql
alter table hadid.workouts enable row level security;

create policy "owner reads"   on hadid.workouts for select using (auth.uid() = user_id);
create policy "owner inserts" on hadid.workouts for insert with check (auth.uid() = user_id);
create policy "owner updates" on hadid.workouts for update using (auth.uid() = user_id);
create policy "owner deletes" on hadid.workouts for delete using (auth.uid() = user_id);
```

Child tables check ownership through their parent:

```sql
create policy "owner reads sets" on hadid.sets for select
using (exists (
  select 1
  from hadid.workout_exercises we
  join hadid.workouts w on w.id = we.workout_id
  where we.id = sets.workout_exercise_id
    and w.user_id = auth.uid()
));
```

`exercises` is the one split case — built-ins are readable by everyone, custom ones only by their owner:

```sql
create policy "read builtin or own" on hadid.exercises for select
using (user_id is null or user_id = auth.uid());

create policy "write own only" on hadid.exercises for insert
with check (user_id = auth.uid());
```

Reference tables (`muscle_groups`, `exercise_muscles`, `achievements`) are read-only to `authenticated` and `anon`, with no write policy at all.

## 5. Functions & triggers

**`handle_new_user()`** — `after insert on auth.users`, creates the matching `profiles` row.

**`update_workout_totals()`** — `after insert/delete on sets`, recomputes `total_volume_kg` and `total_sets` on the parent workout, excluding warm-up sets.

**`detect_prs(p_workout_id uuid)`** — `security definer`. Runs on workout finish. Scans the session's non-warm-up sets, compares against existing records per exercise, inserts new `personal_records` rows with `previous_value` filled in. Returns the list of new PRs so the finish sheet can display them.

**`evaluate_achievements(p_user_id uuid)`** — `security definer`. Recomputes every metric, upserts `user_achievements.progress`, and stamps `unlocked_at` where a threshold is newly crossed. Returns only the newly unlocked rows.

**`finish_workout(p_workout_id uuid)`** — the single call the client makes at session end. Sets `ended_at` and `duration_seconds`, then calls `detect_prs` and `evaluate_achievements` in one transaction, returning `{ summary, new_prs, new_badges }`. One round trip, atomic, and impossible to half-apply.

Client code never writes to `personal_records` or `user_achievements` directly — there is no insert policy for those tables at all.

## 6. Seed data

| Dataset | Rows | Source |
|---------|------|--------|
| `muscle_groups` | 18 | `data/muscle-groups.ts` — matched to anatomy SVG group IDs |
| `exercises` | 115 built-ins | `data/exercises.seed.ts` — aliases, equipment, type |
| `exercise_muscles` | 295 | Activation-weighted mapping, derived from the same file |
| `achievements` | 24 badges | `data/badges.config.ts` — 8 milestones, 8 volume, 8 strength |

**One source, two outputs.** The TypeScript files are authoritative; `npm run seed:gen` emits `supabase/seed/reference.sql` from them. Maintaining the library in both SQL and TS by hand stays in sync for about two weeks.

The TS copy is bundled at build time, so exercise search runs with zero network calls and the Add Exercise screen is instant offline.

115 exercises rather than the 200 originally scoped — the list covers every muscle group and equipment type with the movements people actually log. Adding more is editing one array and re-running the generator; padding it now would just be padding.

## 7. Migration order

```
0001_schema.sql            -- hadid schema, pgcrypto, pg_trgm, set_updated_at, grants
0002_profiles.sql          -- profiles + handle_new_user trigger
0003_muscle_groups.sql     -- reference table + seed
0004_exercises.sql         -- exercises, exercise_muscles, search index
0005_routines.sql          -- routines, versions, exercises, sets
0006_workouts.sql          -- workouts, workout_exercises, sets + totals trigger
0007_records.sql           -- personal_records + detect_prs
0008_achievements.sql      -- achievements, user_achievements + evaluate_achievements
0009_views.sql             -- v_daily_volume, v_muscle_load, v_workout_summary
0010_rls.sql               -- every policy, in one reviewable place
0011_finish_workout.sql    -- the composite finish function
```

Keeping all RLS in one migration is deliberate — policies are the security boundary, and they should be readable as a single document rather than scattered across ten files.

Regenerate types after every migration:

There is no linked Supabase CLI in this project, so regenerate from the dashboard: **API Docs → Generate types → TypeScript**, scoped to the `hadid` schema, and paste over `types/database.ts`.
