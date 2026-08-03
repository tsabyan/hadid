-- GENERATED FILE — do not edit. Run: npm run sql:bundle
--
-- Every migration in order, followed by the reference seed.
-- Safe to re-run: every statement is idempotent.
--
-- Paste into Supabase → SQL Editor → Run.
-- Afterwards, add `hadid` under Settings → API → Exposed schemas, or every
-- query returns 404 no matter how correct the grants and policies are.


-- ===========================================================================
-- 0001_schema.sql
-- ===========================================================================

-- 0001 — the hadid schema, extensions, helpers, grants
--
-- This Supabase project is shared with another app (which owns the `sukun`
-- schema), so `public` is not ours to take. Two apps that both create a table
-- called `profiles` or `achievements` in `public` will collide, and the
-- collision surfaces as a baffling RLS failure rather than an obvious error.
--
-- Three consequences of living outside `public`, all handled below:
--   1. PostgREST does not expose the schema until it is added under
--      Dashboard → Settings → API → Exposed schemas. Until then every
--      query returns 404.
--   2. Supabase's default grants only cover `public`. Usage and table
--      privileges must be granted explicitly — including default privileges,
--      or the next table added in a later migration is invisible to the API.
--   3. The client must be constructed with `db: { schema: 'hadid' }`.
--      Already done in lib/supabase/*.ts.

create schema if not exists hadid;

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy exercise search

-- Shared updated_at trigger. Pinned search_path for the same reason it is
-- pinned in every security definer function below.
create or replace function hadid.set_updated_at()
returns trigger
language plpgsql
set search_path = hadid, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Joins a text[] for full-text indexing.
--
-- `array_to_string` cannot be used directly in a generated column: Postgres
-- marks it STABLE rather than IMMUTABLE, because for a generic anyarray the
-- element type's output function might not be immutable. For text[] it always
-- is, so this wrapper asserts what the generic signature cannot.
create or replace function hadid.array_to_text(arr text[])
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select coalesce(array_to_string(arr, ' '), '');
$$;

-- ---------------------------------------------------------------------------
-- Grants
--
-- Deliberately broad. RLS is what restricts rows; a GRANT without RLS would be
-- the actual mistake. Every table created in later migrations enables RLS.
-- ---------------------------------------------------------------------------

grant usage on schema hadid to anon, authenticated, service_role;

grant all on all tables    in schema hadid to anon, authenticated, service_role;
grant all on all routines  in schema hadid to anon, authenticated, service_role;
grant all on all sequences in schema hadid to anon, authenticated, service_role;

-- Without these, every future migration needs the grants above re-run by hand.
alter default privileges in schema hadid
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema hadid
  grant all on routines to anon, authenticated, service_role;
alter default privileges in schema hadid
  grant all on sequences to anon, authenticated, service_role;

-- ===========================================================================
-- 0002_profiles.sql
-- ===========================================================================

-- 0002 — profiles
--
-- One row per auth user, created by trigger. Anonymous users are real auth
-- users with a real auth.uid(), so they get a profile from their first second.
-- That is what makes zero-friction onboarding possible: the app has somewhere
-- to store preferences before anyone has typed an email address.

create table if not exists hadid.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  unit_system          text        not null default 'metric'
                                   check (unit_system in ('metric', 'imperial')),
  default_rest_seconds int         not null default 120
                                   check (default_rest_seconds between 0 and 900),
  theme                text        not null default 'system'
                                   check (theme in ('system', 'light', 'dark')),
  week_starts_on       int         not null default 1
                                   check (week_starts_on between 0 and 6),
  onboarded            boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists t_profiles_updated on hadid.profiles;
create trigger t_profiles_updated
  before update on hadid.profiles
  for each row execute function hadid.set_updated_at();

-- security definer: the trigger runs as the postgres role because the inserting
-- session (an anonymous signup) has no rights on this table. search_path is
-- pinned — without it the function resolves names using the caller's
-- search_path, which is a privilege escalation waiting to happen.
create or replace function hadid.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = hadid, pg_temp
as $$
begin
  insert into hadid.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- Named for this app. The shared database already carries another
-- on_auth_user_created trigger for the neighbouring app, and Postgres allows
-- several triggers on the same table — but only if the names differ.
drop trigger if exists on_auth_user_created_hadid on auth.users;
create trigger on_auth_user_created_hadid
  after insert on auth.users
  for each row execute function hadid.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table hadid.profiles enable row level security;

drop policy if exists "own profile" on hadid.profiles;
create policy "own profile" on hadid.profiles
  for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Backfill profiles for any auth users that already exist in this shared
-- project. Without this, an account created by the neighbouring app has no
-- hadid profile and every query for it returns zero rows.
insert into hadid.profiles (id)
select u.id from auth.users u
on conflict do nothing;

-- ===========================================================================
-- 0003_muscle_groups.sql
-- ===========================================================================

-- 0003 — muscle groups
--
-- Reference data with no owner. IDs are stable strings, not UUIDs, because
-- `svg_group` is joined to a `<g id>` in the anatomy diagram — a renamed
-- muscle would silently stop tinting rather than raising an error.

create table if not exists hadid.muscle_groups (
  id         text primary key,
  name       text not null,
  region     text not null check (region in ('upper', 'lower', 'core')),
  body_side  text not null check (body_side in ('front', 'back', 'both')),
  svg_group  text not null,
  sort_order int  not null default 0
);

-- Rows come from supabase/seed/reference.sql, generated from data/*.ts so the
-- bundled client copy and the database copy cannot drift.

-- ===========================================================================
-- 0004_exercises.sql
-- ===========================================================================

-- 0004 — exercises and their muscle mapping
--
-- One table holds both the built-in library and every user's custom moves.
-- `user_id is null` means built-in and readable by everyone; a set `user_id`
-- means private. Splitting these into two tables would double every query on
-- the busiest read path in the app for no benefit.

create table if not exists hadid.exercises (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade,
  slug                 text unique,
  name                 text not null,
  aliases              text[] not null default '{}',
  equipment            text not null default 'other'
                       check (equipment in ('barbell','dumbbell','machine','cable',
                                            'bodyweight','kettlebell','band','other')),
  type                 text not null default 'strength'
                       check (type in ('strength','cardio','mobility')),
  is_unilateral        boolean not null default false,
  default_rest_seconds int check (default_rest_seconds between 0 and 900),
  instructions         text,
  created_at           timestamptz not null default now(),

  -- Built-ins carry a slug and no owner; custom moves carry an owner and no
  -- slug. Enforced rather than assumed, because the RLS policy below and the
  -- seed's upsert both depend on it.
  constraint exercises_builtin_has_slug
    check ((user_id is null and slug is not null)
        or (user_id is not null and slug is null)),

  -- Searching aliases as well as names is what lets "bench" and "ohp" find
  -- anything at all. The wrapper in 0001 is required here: array_to_string
  -- itself is STABLE, and a generated column rejects anything not IMMUTABLE.
  search_vector tsvector generated always as (
    to_tsvector('english'::regconfig, name || ' ' || hadid.array_to_text(aliases))
  ) stored
);

create index if not exists exercises_search_idx  on hadid.exercises using gin (search_vector);
create index if not exists exercises_name_trgm   on hadid.exercises using gin (name gin_trgm_ops);
create index if not exists exercises_user_idx    on hadid.exercises (user_id);

-- A user cannot have two custom exercises with the same name. Built-ins are
-- excluded from the constraint because `user_id` is null for all of them and
-- nulls do not conflict in a unique index.
create unique index if not exists exercises_user_name_uniq
  on hadid.exercises (user_id, lower(name)) where user_id is not null;

-- ---------------------------------------------------------------------------
-- Muscle mapping
--
-- The weighting is the whole point. Without per-muscle activation the heat map
-- can only say "chest was involved", which is not information anyone trains on.
-- ---------------------------------------------------------------------------

create table if not exists hadid.exercise_muscles (
  exercise_id     uuid not null references hadid.exercises(id) on delete cascade,
  muscle_group_id text not null references hadid.muscle_groups(id) on delete cascade,
  role            text not null check (role in ('primary', 'secondary')),
  activation      numeric(3,2) not null check (activation between 0 and 1),
  primary key (exercise_id, muscle_group_id)
);

create index if not exists exercise_muscles_muscle_idx
  on hadid.exercise_muscles (muscle_group_id);

-- ===========================================================================
-- 0005_routines.sql
-- ===========================================================================

-- 0005 — routines, versions, and their target sets
--
-- A routine is a container; a routine_version is the actual structure. When a
-- routine that already has logged history is edited, a new version is created
-- rather than the old one mutated — otherwise last month's workout would
-- retroactively claim it was performed with today's sets and weights.

create table if not exists hadid.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  notes       text,
  color       text,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists routines_user_idx on hadid.routines (user_id, archived_at);

drop trigger if exists t_routines_updated on hadid.routines;
create trigger t_routines_updated
  before update on hadid.routines
  for each row execute function hadid.set_updated_at();

create table if not exists hadid.routine_versions (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references hadid.routines(id) on delete cascade,
  version    int  not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (routine_id, version)
);

-- Exactly one current version per routine. A partial unique index is the only
-- way to express "at most one true" without a trigger.
create unique index if not exists routine_versions_one_current
  on hadid.routine_versions (routine_id) where is_current;

create table if not exists hadid.routine_exercises (
  id                 uuid primary key default gen_random_uuid(),
  routine_version_id uuid not null references hadid.routine_versions(id) on delete cascade,
  exercise_id        uuid not null references hadid.exercises(id) on delete restrict,
  position           int  not null,
  rest_seconds       int check (rest_seconds between 0 and 900),
  superset_with_next boolean not null default false,
  notes              text
);

-- Deferrable, so a reorder can renumber every row inside one transaction
-- without tripping the constraint halfway through the shuffle.
alter table hadid.routine_exercises
  drop constraint if exists routine_exercises_position_uniq;
alter table hadid.routine_exercises
  add constraint routine_exercises_position_uniq
  unique (routine_version_id, position) deferrable initially immediate;

create table if not exists hadid.routine_sets (
  id                  uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references hadid.routine_exercises(id) on delete cascade,
  set_number          int  not null,
  target_weight_kg    numeric(6,2) check (target_weight_kg >= 0),
  target_reps         int check (target_reps between 0 and 1000),
  is_warmup           boolean not null default false,
  unique (routine_exercise_id, set_number)
);

-- ===========================================================================
-- 0006_workouts.sql
-- ===========================================================================

-- 0006 — workouts, their exercises, and logged sets
--
-- IDs here are client-generated. A workout that starts in a basement with no
-- signal must have a stable identity before the server ever hears about it,
-- or the offline queue cannot reference its own rows.

create table if not exists hadid.workouts (
  id                 uuid primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  routine_version_id uuid references hadid.routine_versions(id) on delete set null,
  name               text not null default 'Workout',
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  duration_seconds   int,
  total_volume_kg    numeric(12,2) not null default 0,
  total_sets         int not null default 0,
  notes              text,
  created_at         timestamptz not null default now()
);

create index if not exists workouts_user_started_idx
  on hadid.workouts (user_id, started_at desc);

-- At most one workout in progress per user. Two live sessions is always a bug
-- — usually a duplicate tab — and it corrupts the streak and volume maths.
create unique index if not exists workouts_one_active
  on hadid.workouts (user_id) where ended_at is null;

create table if not exists hadid.workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references hadid.workouts(id) on delete cascade,
  exercise_id  uuid not null references hadid.exercises(id) on delete restrict,
  position     int  not null,
  rest_seconds int check (rest_seconds between 0 and 900),
  notes        text,
  unique (workout_id, position)
);

create index if not exists workout_exercises_workout_idx
  on hadid.workout_exercises (workout_id);

create table if not exists hadid.sets (
  id                  uuid primary key,
  workout_exercise_id uuid not null references hadid.workout_exercises(id) on delete cascade,
  set_number          int  not null,
  weight_kg           numeric(6,2) not null default 0 check (weight_kg >= 0),
  reps                int  not null check (reps between 0 and 1000),
  is_warmup           boolean not null default false,
  rpe                 numeric(3,1) check (rpe between 1 and 10),
  volume_kg           numeric(12,2) generated always as (weight_kg * reps) stored,
  completed_at        timestamptz not null default now(),
  unique (workout_exercise_id, set_number)
);

create index if not exists sets_workout_exercise_idx
  on hadid.sets (workout_exercise_id, set_number);

-- ---------------------------------------------------------------------------
-- Denormalized totals
--
-- Recomputed rather than incremented. An increment would drift the first time
-- a set is edited or a delete arrives out of order from the offline queue, and
-- a drifting total is worse than a slightly slower write.
--
-- Warm-up sets are excluded: counting them would inflate every volume chart
-- and hand out volume badges for empty-bar work.
-- ---------------------------------------------------------------------------

create or replace function hadid.refresh_workout_totals()
returns trigger
language plpgsql
security definer set search_path = hadid, pg_temp
as $$
declare
  v_workout_exercise_id uuid := coalesce(new.workout_exercise_id, old.workout_exercise_id);
  v_workout_id uuid;
begin
  select we.workout_id into v_workout_id
  from hadid.workout_exercises we
  where we.id = v_workout_exercise_id;

  if v_workout_id is null then
    return coalesce(new, old);
  end if;

  update hadid.workouts w
  set total_volume_kg = coalesce(agg.volume, 0),
      total_sets      = coalesce(agg.sets, 0)
  from (
    select sum(s.volume_kg) as volume, count(*) as sets
    from hadid.sets s
    join hadid.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id = v_workout_id
      and s.is_warmup = false
  ) agg
  where w.id = v_workout_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists t_sets_totals on hadid.sets;
create trigger t_sets_totals
  after insert or update or delete on hadid.sets
  for each row execute function hadid.refresh_workout_totals();

-- ===========================================================================
-- 0007_records.sql
-- ===========================================================================

-- 0007 — personal records
--
-- Materialized rather than derived. The PR banner and the finish sheet both
-- want "what did I just beat" instantly, and scanning every set a user has
-- ever logged to answer that gets slower every week they train.
--
-- Four record types per exercise:
--   max_weight  — heaviest load moved for any rep count
--   max_reps    — most reps in a single set
--   max_volume  — heaviest single set by weight x reps
--   est_1rm     — Epley estimate, shown as an estimate and never as a lift

create table if not exists hadid.personal_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  exercise_id    uuid not null references hadid.exercises(id) on delete cascade,
  record_type    text not null
                 check (record_type in ('max_weight','max_reps','max_volume','est_1rm')),
  value          numeric(10,2) not null,
  reps           int,
  set_id         uuid references hadid.sets(id) on delete set null,
  achieved_at    timestamptz not null default now(),
  -- Null means "first record of its kind", which is a baseline rather than an
  -- improvement. The distinction matters: badges count improvements only, or
  -- a first workout with four exercises would unlock half the strength tier.
  previous_value numeric(10,2)
);

create index if not exists prs_user_achieved_idx
  on hadid.personal_records (user_id, achieved_at desc);
create index if not exists prs_user_exercise_idx
  on hadid.personal_records (user_id, exercise_id, record_type);

-- ---------------------------------------------------------------------------
-- detect_prs
--
-- security definer: the client has no insert policy on personal_records at
-- all. A PR the browser can write is a PR the browser can invent, and the
-- whole point of the strength badges is that they were earned.
-- ---------------------------------------------------------------------------

create or replace function hadid.detect_prs(p_workout_id uuid)
returns table (
  exercise_id    uuid,
  record_type    text,
  value          numeric,
  previous_value numeric,
  reps           int
)
language plpgsql
security definer set search_path = hadid, pg_temp
as $$
declare
  v_user uuid;
begin
  select w.user_id into v_user
  from hadid.workouts w
  where w.id = p_workout_id;

  if v_user is null then
    return;
  end if;

  return query
  with session_sets as (
    select we.exercise_id                            as ex,
           s.id                                      as set_id,
           s.weight_kg,
           s.reps,
           s.volume_kg,
           s.completed_at,
           -- Epley. Displayed as a secondary line, never as a logged lift.
           round(s.weight_kg * (1 + s.reps::numeric / 30), 2) as est_1rm
    from hadid.sets s
    join hadid.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id = p_workout_id
      and s.is_warmup = false
      and s.reps > 0
  ),
  candidates as (
    select ex, 'max_weight'::text as rt, weight_kg as val, reps, set_id, completed_at,
           row_number() over (partition by ex order by weight_kg desc, reps desc) as rn
    from session_sets
    union all
    select ex, 'max_reps', reps::numeric, reps, set_id, completed_at,
           row_number() over (partition by ex order by reps desc, weight_kg desc)
    from session_sets
    union all
    select ex, 'max_volume', volume_kg, reps, set_id, completed_at,
           row_number() over (partition by ex order by volume_kg desc)
    from session_sets
    union all
    select ex, 'est_1rm', est_1rm, reps, set_id, completed_at,
           row_number() over (partition by ex order by est_1rm desc)
    from session_sets
  ),
  best as (
    select * from candidates where rn = 1
  ),
  prior as (
    select b.*,
           (select max(pr.value)
            from hadid.personal_records pr
            where pr.user_id = v_user
              and pr.exercise_id = b.ex
              and pr.record_type = b.rt) as prev
    from best b
  ),
  inserted as (
    insert into hadid.personal_records
      (user_id, exercise_id, record_type, value, reps, set_id, achieved_at, previous_value)
    select v_user, p.ex, p.rt, p.val, p.reps, p.set_id, p.completed_at, p.prev
    from prior p
    where p.prev is null or p.val > p.prev
    returning personal_records.exercise_id,
              personal_records.record_type,
              personal_records.value,
              personal_records.previous_value,
              personal_records.reps
  )
  select * from inserted;
end;
$$;

-- ===========================================================================
-- 0008_achievements.sql
-- ===========================================================================

-- 0008 — achievements
--
-- Every badge is a threshold on one of five metrics. Unlock evaluation runs in
-- Postgres, not the browser, for the same reason PR detection does: a badge
-- the client can grant is a badge that means nothing.

-- Streaks need a day boundary, and a day boundary needs a timezone. Added here
-- rather than in 0002 because that migration may already have been applied.
alter table hadid.profiles
  add column if not exists timezone text not null default 'UTC';

-- No icon column. Badge artwork is a presentation concern that belongs with
-- the design system, keyed by badge id — storing an emoji here would make a
-- placeholder permanent and force a migration to change a picture.
create table if not exists hadid.achievements (
  id          text primary key,
  category    text not null check (category in ('milestones','volume','strength')),
  name        text not null,
  description text not null,
  metric      text not null
              check (metric in ('workouts_count','total_volume_kg','streak_days',
                                'sets_count','pr_count')),
  threshold   numeric not null check (threshold > 0),
  sort_order  int not null default 0
);

create table if not exists hadid.user_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references hadid.achievements(id) on delete cascade,
  progress       numeric not null default 0,
  unlocked_at    timestamptz,
  primary key (user_id, achievement_id)
);

create index if not exists user_achievements_unlocked_idx
  on hadid.user_achievements (user_id, unlocked_at desc);

-- ---------------------------------------------------------------------------
-- evaluate_achievements
--
-- Recomputes all five metrics from scratch and upserts progress for every
-- badge. Full recomputation rather than incremental counters, so that a user
-- who imports history, deletes a workout, or syncs an offline backlog ends up
-- with the same answer either way.
--
-- Returns only the rows that flipped to unlocked on this call, which is what
-- the finish sheet animates.
-- ---------------------------------------------------------------------------

create or replace function hadid.evaluate_achievements(p_user_id uuid)
returns table (achievement_id text, name text, category text)
language plpgsql
security definer set search_path = hadid, pg_temp
as $$
declare
  v_tz       text;
  v_workouts numeric;
  v_volume   numeric;
  v_sets     numeric;
  v_prs      numeric;
  v_streak   numeric;
begin
  -- security definer bypasses RLS, and this function takes a user id as an
  -- argument. Without this check any authenticated user could pass someone
  -- else's uuid and read back their badge unlocks. auth.uid() survives the
  -- definer switch — it reads the request JWT, not the current role — so it
  -- is still the caller here even when finish_workout is the one calling.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not your achievements';
  end if;

  select coalesce(p.timezone, 'UTC') into v_tz
  from hadid.profiles p where p.id = p_user_id;

  v_tz := coalesce(v_tz, 'UTC');

  select count(*), coalesce(sum(w.total_volume_kg), 0)
    into v_workouts, v_volume
  from hadid.workouts w
  where w.user_id = p_user_id and w.ended_at is not null;

  select count(*)
    into v_sets
  from hadid.sets s
  join hadid.workout_exercises we on we.id = s.workout_exercise_id
  join hadid.workouts w on w.id = we.workout_id
  where w.user_id = p_user_id and w.ended_at is not null and s.is_warmup = false;

  -- Improvements only. A first-ever record is a baseline, not an achievement.
  select count(*)
    into v_prs
  from hadid.personal_records pr
  where pr.user_id = p_user_id and pr.previous_value is not null;

  -- Current streak: the length of the most recent unbroken run of training
  -- days, counted in the user's own timezone. A run that ended before
  -- yesterday is history, not a streak, so it scores zero.
  with days as (
    select distinct ((w.started_at at time zone v_tz)::date) as d
    from hadid.workouts w
    where w.user_id = p_user_id and w.ended_at is not null
  ),
  grouped as (
    select d, d - (row_number() over (order by d))::int as grp
    from days
  ),
  runs as (
    select count(*) as len, max(d) as last_day
    from grouped group by grp
  )
  select coalesce(max(len), 0) into v_streak
  from runs
  where last_day >= ((now() at time zone v_tz)::date - 1);

  return query
  with metrics(metric, value) as (
    values ('workouts_count',  v_workouts),
           ('total_volume_kg', v_volume),
           ('sets_count',      v_sets),
           ('pr_count',        v_prs),
           ('streak_days',     v_streak)
  ),
  upserted as (
    insert into hadid.user_achievements (user_id, achievement_id, progress, unlocked_at)
    select p_user_id,
           a.id,
           m.value,
           case when m.value >= a.threshold then now() end
    from hadid.achievements a
    join metrics m on m.metric = a.metric
    on conflict (user_id, achievement_id) do update
      set progress = excluded.progress,
          -- Never re-stamp an existing unlock. The date a badge was earned is
          -- part of the badge, and losing a streak must not revoke it.
          unlocked_at = coalesce(hadid.user_achievements.unlocked_at, excluded.unlocked_at)
    returning hadid.user_achievements.achievement_id,
              hadid.user_achievements.unlocked_at
  )
  select a.id, a.name, a.category
  from upserted u
  join hadid.achievements a on a.id = u.achievement_id
  -- now() is the transaction timestamp, so rows stamped by this call carry it
  -- exactly. Anything unlocked in an earlier session has an older value.
  where u.unlocked_at = now();
end;
$$;

-- ===========================================================================
-- 0009_views.sql
-- ===========================================================================

-- 0009 — aggregate views
--
-- Plain views, not materialized. A materialized view needs a refresh strategy,
-- and a stale chart is a worse failure than a slightly slower query. Promote
-- these only if the free-tier instance actually shows a problem.
--
-- Views inherit the RLS of their underlying tables when created with
-- security_invoker, which is why it is set explicitly here. Without it a view
-- runs as its owner and quietly hands every user everyone else's history.

create or replace view hadid.v_daily_volume
with (security_invoker = true) as
select w.user_id,
       (w.started_at at time zone coalesce(p.timezone, 'UTC'))::date as day,
       count(distinct w.id)                as workout_count,
       coalesce(sum(w.total_volume_kg), 0) as volume_kg,
       coalesce(sum(w.total_sets), 0)      as set_count,
       coalesce(sum(w.duration_seconds), 0) as duration_seconds
from hadid.workouts w
left join hadid.profiles p on p.id = w.user_id
where w.ended_at is not null
group by w.user_id, 2;

create or replace view hadid.v_muscle_load
with (security_invoker = true) as
select w.user_id,
       (w.started_at at time zone coalesce(p.timezone, 'UTC'))::date as day,
       em.muscle_group_id,
       -- Volume weighted by how much the muscle actually contributes. Without
       -- the activation factor every assisting muscle would score as heavily
       -- as the target, and the heat map would be a uniform smear.
       sum(s.volume_kg * em.activation) as load_kg
from hadid.sets s
join hadid.workout_exercises we on we.id = s.workout_exercise_id
join hadid.workouts w          on w.id = we.workout_id
join hadid.exercise_muscles em on em.exercise_id = we.exercise_id
left join hadid.profiles p     on p.id = w.user_id
where w.ended_at is not null
  and s.is_warmup = false
group by w.user_id, 2, em.muscle_group_id;

create or replace view hadid.v_workout_summary
with (security_invoker = true) as
select w.id            as workout_id,
       w.user_id,
       w.name,
       w.started_at,
       w.ended_at,
       w.duration_seconds,
       w.total_volume_kg,
       w.total_sets,
       count(distinct we.exercise_id) as exercise_count,
       array_agg(distinct e.name order by e.name)
         filter (where e.name is not null) as exercise_names
from hadid.workouts w
left join hadid.workout_exercises we on we.workout_id = w.id
left join hadid.exercises e          on e.id = we.exercise_id
group by w.id;

-- ===========================================================================
-- 0010_rls.sql
-- ===========================================================================

-- 0010 — row level security
--
-- Every policy in the app lives in this one file on purpose. RLS *is* the
-- authorization model here: there is no privileged server path, the anon key
-- ships in the browser bundle, and the service role key is only ever used by
-- the keepalive cron. Policies scattered across ten migrations cannot be
-- reviewed as a whole, and a boundary you cannot read in one sitting is a
-- boundary nobody checks.
--
-- Ownership is expressed two ways:
--   * direct    — the table has a user_id
--   * inherited — the table reaches a user_id through its parent

alter table hadid.muscle_groups      enable row level security;
alter table hadid.exercises          enable row level security;
alter table hadid.exercise_muscles   enable row level security;
alter table hadid.routines           enable row level security;
alter table hadid.routine_versions   enable row level security;
alter table hadid.routine_exercises  enable row level security;
alter table hadid.routine_sets       enable row level security;
alter table hadid.workouts           enable row level security;
alter table hadid.workout_exercises  enable row level security;
alter table hadid.sets               enable row level security;
alter table hadid.personal_records   enable row level security;
alter table hadid.achievements       enable row level security;
alter table hadid.user_achievements  enable row level security;

-- ---------------------------------------------------------------------------
-- Reference data — readable by everyone, writable by nobody.
-- No insert/update/delete policy exists, so those are denied by default.
-- ---------------------------------------------------------------------------

drop policy if exists "read muscle groups" on hadid.muscle_groups;
create policy "read muscle groups" on hadid.muscle_groups
  for select to anon, authenticated using (true);

drop policy if exists "read achievements" on hadid.achievements;
create policy "read achievements" on hadid.achievements
  for select to anon, authenticated using (true);

drop policy if exists "read exercise muscles" on hadid.exercise_muscles;
create policy "read exercise muscles" on hadid.exercise_muscles
  for select to anon, authenticated using (true);

-- Custom exercises need their mapping written too, so ownership is inherited
-- from the exercise. Built-ins have a null user_id and fail this check, which
-- is what keeps the shared library read-only.
drop policy if exists "write own exercise muscles" on hadid.exercise_muscles;
create policy "write own exercise muscles" on hadid.exercise_muscles
  for all to authenticated
  using (exists (select 1 from hadid.exercises e
                 where e.id = exercise_muscles.exercise_id and e.user_id = auth.uid()))
  with check (exists (select 1 from hadid.exercises e
                      where e.id = exercise_muscles.exercise_id and e.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Exercises — built-ins are public, custom ones are private.
-- ---------------------------------------------------------------------------

drop policy if exists "read builtin or own exercises" on hadid.exercises;
create policy "read builtin or own exercises" on hadid.exercises
  for select to anon, authenticated
  using (user_id is null or user_id = auth.uid());

drop policy if exists "insert own exercises" on hadid.exercises;
create policy "insert own exercises" on hadid.exercises
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "update own exercises" on hadid.exercises;
create policy "update own exercises" on hadid.exercises
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own exercises" on hadid.exercises;
create policy "delete own exercises" on hadid.exercises
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Directly owned tables
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['routines', 'workouts'] loop
    execute format('drop policy if exists "own rows" on hadid.%I', t);
    execute format($f$
      create policy "own rows" on hadid.%I
        for all to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Inherited ownership
--
-- Each policy walks up to the row that carries user_id. The joins are indexed
-- on both sides, so this costs a lookup rather than a scan.
-- ---------------------------------------------------------------------------

drop policy if exists "own routine versions" on hadid.routine_versions;
create policy "own routine versions" on hadid.routine_versions
  for all to authenticated
  using (exists (select 1 from hadid.routines r
                 where r.id = routine_versions.routine_id and r.user_id = auth.uid()))
  with check (exists (select 1 from hadid.routines r
                      where r.id = routine_versions.routine_id and r.user_id = auth.uid()));

drop policy if exists "own routine exercises" on hadid.routine_exercises;
create policy "own routine exercises" on hadid.routine_exercises
  for all to authenticated
  using (exists (select 1 from hadid.routine_versions rv
                 join hadid.routines r on r.id = rv.routine_id
                 where rv.id = routine_exercises.routine_version_id
                   and r.user_id = auth.uid()))
  with check (exists (select 1 from hadid.routine_versions rv
                      join hadid.routines r on r.id = rv.routine_id
                      where rv.id = routine_exercises.routine_version_id
                        and r.user_id = auth.uid()));

drop policy if exists "own routine sets" on hadid.routine_sets;
create policy "own routine sets" on hadid.routine_sets
  for all to authenticated
  using (exists (select 1 from hadid.routine_exercises re
                 join hadid.routine_versions rv on rv.id = re.routine_version_id
                 join hadid.routines r on r.id = rv.routine_id
                 where re.id = routine_sets.routine_exercise_id
                   and r.user_id = auth.uid()))
  with check (exists (select 1 from hadid.routine_exercises re
                      join hadid.routine_versions rv on rv.id = re.routine_version_id
                      join hadid.routines r on r.id = rv.routine_id
                      where re.id = routine_sets.routine_exercise_id
                        and r.user_id = auth.uid()));

drop policy if exists "own workout exercises" on hadid.workout_exercises;
create policy "own workout exercises" on hadid.workout_exercises
  for all to authenticated
  using (exists (select 1 from hadid.workouts w
                 where w.id = workout_exercises.workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from hadid.workouts w
                      where w.id = workout_exercises.workout_id and w.user_id = auth.uid()));

drop policy if exists "own sets" on hadid.sets;
create policy "own sets" on hadid.sets
  for all to authenticated
  using (exists (select 1 from hadid.workout_exercises we
                 join hadid.workouts w on w.id = we.workout_id
                 where we.id = sets.workout_exercise_id and w.user_id = auth.uid()))
  with check (exists (select 1 from hadid.workout_exercises we
                      join hadid.workouts w on w.id = we.workout_id
                      where we.id = sets.workout_exercise_id and w.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Earned data — readable by its owner, writable by nobody.
--
-- There is deliberately no insert or update policy on either table. Both are
-- written exclusively by security definer functions, which is what makes a PR
-- and a badge mean something: the client cannot fabricate them.
-- ---------------------------------------------------------------------------

drop policy if exists "read own prs" on hadid.personal_records;
create policy "read own prs" on hadid.personal_records
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "read own achievements" on hadid.user_achievements;
create policy "read own achievements" on hadid.user_achievements
  for select to authenticated using (user_id = auth.uid());

-- Deleting a workout should take its records with it, so a delete policy is
-- the one write the owner does get.
drop policy if exists "delete own prs" on hadid.personal_records;
create policy "delete own prs" on hadid.personal_records
  for delete to authenticated using (user_id = auth.uid());

-- ===========================================================================
-- 0011_finish_workout.sql
-- ===========================================================================

-- 0011 — finish_workout
--
-- The single call the client makes when a session ends. Stamps the end time,
-- detects records, re-evaluates badges, and returns everything the summary
-- sheet needs, in one transaction.
--
-- One round trip rather than three, because the alternative is a half-finished
-- workout: connection drops after the end stamp but before PR detection, and
-- the user has a completed session that never awarded anything. In a gym
-- basement that is not a rare case.

create or replace function hadid.finish_workout(p_workout_id uuid)
returns jsonb
language plpgsql
security definer set search_path = hadid, pg_temp
as $$
declare
  v_user    uuid;
  v_summary jsonb;
  v_prs     jsonb;
  v_badges  jsonb;
begin
  -- security definer bypasses RLS, so ownership is checked by hand. Without
  -- this, any authenticated user could finish anyone's workout by guessing an
  -- id — the one hole a definer function opens if you let it.
  select w.user_id into v_user
  from hadid.workouts w
  where w.id = p_workout_id;

  if v_user is null then
    raise exception 'workout not found';
  end if;

  if v_user <> auth.uid() then
    raise exception 'not your workout';
  end if;

  update hadid.workouts w
  set ended_at = coalesce(w.ended_at, now()),
      duration_seconds = coalesce(
        w.duration_seconds,
        greatest(0, extract(epoch from (now() - w.started_at))::int)
      )
  where w.id = p_workout_id;

  select coalesce(jsonb_agg(to_jsonb(pr)), '[]'::jsonb)
    into v_prs
  from hadid.detect_prs(p_workout_id) pr;

  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
    into v_badges
  from hadid.evaluate_achievements(v_user) b;

  select to_jsonb(s) into v_summary
  from hadid.v_workout_summary s
  where s.workout_id = p_workout_id;

  return jsonb_build_object(
    'summary',    coalesce(v_summary, '{}'::jsonb),
    'new_prs',    v_prs,
    'new_badges', v_badges
  );
end;
$$;

-- The client calls this through PostgREST rather than writing ended_at itself.
grant execute on function hadid.finish_workout(uuid) to authenticated;
grant execute on function hadid.evaluate_achievements(uuid) to authenticated;
revoke execute on function hadid.detect_prs(uuid) from anon, authenticated;

-- ===========================================================================
-- seed/reference.sql
-- ===========================================================================

-- GENERATED FILE — do not edit.
-- Source: data/muscle-groups.ts, data/exercises.seed.ts, data/badges.config.ts
-- Regenerate: npm run seed:gen
--
-- Idempotent: every statement upserts on a stable key, so re-running after
-- an edit updates rows in place rather than duplicating the library.

begin;

-- Muscle groups
insert into hadid.muscle_groups (id, name, region, body_side, svg_group, sort_order) values
  ('chest', 'Chest', 'upper', 'front', 'chest', 1),
  ('front_delts', 'Front Delts', 'upper', 'front', 'front-delts', 2),
  ('biceps', 'Biceps', 'upper', 'front', 'biceps', 3),
  ('lats', 'Lats', 'upper', 'back', 'lats', 4),
  ('traps', 'Traps', 'upper', 'back', 'traps', 5),
  ('rhomboids', 'Rhomboids', 'upper', 'back', 'rhomboids', 6),
  ('rear_delts', 'Rear Delts', 'upper', 'back', 'rear-delts', 7),
  ('triceps', 'Triceps', 'upper', 'back', 'triceps', 8),
  ('side_delts', 'Side Delts', 'upper', 'both', 'side-delts', 9),
  ('forearms', 'Forearms', 'upper', 'both', 'forearms', 10),
  ('abs', 'Abs', 'core', 'front', 'abs', 11),
  ('obliques', 'Obliques', 'core', 'front', 'obliques', 12),
  ('lower_back', 'Lower Back', 'core', 'back', 'lower-back', 13),
  ('quads', 'Quads', 'lower', 'front', 'quads', 14),
  ('hamstrings', 'Hamstrings', 'lower', 'back', 'hamstrings', 15),
  ('glutes', 'Glutes', 'lower', 'back', 'glutes', 16),
  ('calves', 'Calves', 'lower', 'both', 'calves', 17),
  ('adductors', 'Adductors', 'lower', 'front', 'adductors', 18)
on conflict (id) do update set
  name = excluded.name, region = excluded.region,
  body_side = excluded.body_side, svg_group = excluded.svg_group,
  sort_order = excluded.sort_order;

-- Built-in exercises. user_id stays null: these belong to nobody.
insert into hadid.exercises (slug, name, aliases, equipment, type, is_unilateral) values
  ('barbell-bench-press', 'Barbell Bench Press', array['bench', 'bench press', 'bp']::text[], 'barbell', 'strength', false),
  ('incline-barbell-bench-press', 'Incline Barbell Bench Press', array['incline bench']::text[], 'barbell', 'strength', false),
  ('decline-barbell-bench-press', 'Decline Barbell Bench Press', array['decline bench']::text[], 'barbell', 'strength', false),
  ('dumbbell-bench-press', 'Dumbbell Bench Press', array['db bench']::text[], 'dumbbell', 'strength', false),
  ('incline-dumbbell-press', 'Incline Dumbbell Press', array['incline db press']::text[], 'dumbbell', 'strength', false),
  ('decline-dumbbell-press', 'Decline Dumbbell Press', '{}'::text[], 'dumbbell', 'strength', false),
  ('dumbbell-fly', 'Dumbbell Fly', array['flye', 'chest fly']::text[], 'dumbbell', 'strength', false),
  ('incline-dumbbell-fly', 'Incline Dumbbell Fly', '{}'::text[], 'dumbbell', 'strength', false),
  ('cable-fly', 'Cable Fly', array['cable flye']::text[], 'cable', 'strength', false),
  ('cable-crossover', 'Cable Crossover', '{}'::text[], 'cable', 'strength', false),
  ('machine-chest-press', 'Machine Chest Press', '{}'::text[], 'machine', 'strength', false),
  ('pec-deck', 'Pec Deck', array['machine fly']::text[], 'machine', 'strength', false),
  ('push-up', 'Push-Up', array['pushup', 'press up']::text[], 'bodyweight', 'strength', false),
  ('chest-dip', 'Chest Dip', array['dips']::text[], 'bodyweight', 'strength', false),
  ('deadlift', 'Deadlift', array['conventional deadlift', 'dl']::text[], 'barbell', 'strength', false),
  ('sumo-deadlift', 'Sumo Deadlift', '{}'::text[], 'barbell', 'strength', false),
  ('rack-pull', 'Rack Pull', '{}'::text[], 'barbell', 'strength', false),
  ('barbell-row', 'Barbell Row', array['bent over row', 'bor']::text[], 'barbell', 'strength', false),
  ('pendlay-row', 'Pendlay Row', '{}'::text[], 'barbell', 'strength', false),
  ('dumbbell-row', 'Dumbbell Row', array['one arm row', 'db row']::text[], 'dumbbell', 'strength', true),
  ('t-bar-row', 'T-Bar Row', '{}'::text[], 'barbell', 'strength', false),
  ('chest-supported-row', 'Chest-Supported Row', '{}'::text[], 'machine', 'strength', false),
  ('seated-cable-row', 'Seated Cable Row', array['cable row']::text[], 'cable', 'strength', false),
  ('machine-row', 'Machine Row', '{}'::text[], 'machine', 'strength', false),
  ('lat-pulldown', 'Lat Pulldown', array['pulldown']::text[], 'cable', 'strength', false),
  ('close-grip-lat-pulldown', 'Close-Grip Lat Pulldown', '{}'::text[], 'cable', 'strength', false),
  ('pull-up', 'Pull-Up', array['pullup']::text[], 'bodyweight', 'strength', false),
  ('chin-up', 'Chin-Up', array['chinup']::text[], 'bodyweight', 'strength', false),
  ('straight-arm-pulldown', 'Straight-Arm Pulldown', '{}'::text[], 'cable', 'strength', false),
  ('barbell-shrug', 'Barbell Shrug', array['shrug']::text[], 'barbell', 'strength', false),
  ('dumbbell-shrug', 'Dumbbell Shrug', '{}'::text[], 'dumbbell', 'strength', false),
  ('face-pull', 'Face Pull', '{}'::text[], 'cable', 'strength', false),
  ('back-extension', 'Back Extension', array['hyperextension']::text[], 'bodyweight', 'strength', false),
  ('overhead-press', 'Overhead Press', array['ohp', 'military press', 'shoulder press']::text[], 'barbell', 'strength', false),
  ('seated-dumbbell-shoulder-press', 'Seated Dumbbell Shoulder Press', array['db shoulder press']::text[], 'dumbbell', 'strength', false),
  ('arnold-press', 'Arnold Press', '{}'::text[], 'dumbbell', 'strength', false),
  ('machine-shoulder-press', 'Machine Shoulder Press', '{}'::text[], 'machine', 'strength', false),
  ('push-press', 'Push Press', '{}'::text[], 'barbell', 'strength', false),
  ('lateral-raise', 'Lateral Raise', array['side raise', 'lat raise']::text[], 'dumbbell', 'strength', false),
  ('cable-lateral-raise', 'Cable Lateral Raise', '{}'::text[], 'cable', 'strength', true),
  ('front-raise', 'Front Raise', '{}'::text[], 'dumbbell', 'strength', false),
  ('rear-delt-fly', 'Rear Delt Fly', array['reverse fly']::text[], 'dumbbell', 'strength', false),
  ('reverse-pec-deck', 'Reverse Pec Deck', '{}'::text[], 'machine', 'strength', false),
  ('upright-row', 'Upright Row', '{}'::text[], 'barbell', 'strength', false),
  ('barbell-curl', 'Barbell Curl', array['bicep curl']::text[], 'barbell', 'strength', false),
  ('ez-bar-curl', 'EZ-Bar Curl', '{}'::text[], 'barbell', 'strength', false),
  ('dumbbell-curl', 'Dumbbell Curl', array['db curl']::text[], 'dumbbell', 'strength', false),
  ('hammer-curl', 'Hammer Curl', '{}'::text[], 'dumbbell', 'strength', false),
  ('incline-dumbbell-curl', 'Incline Dumbbell Curl', '{}'::text[], 'dumbbell', 'strength', false),
  ('preacher-curl', 'Preacher Curl', '{}'::text[], 'barbell', 'strength', false),
  ('concentration-curl', 'Concentration Curl', '{}'::text[], 'dumbbell', 'strength', true),
  ('cable-curl', 'Cable Curl', '{}'::text[], 'cable', 'strength', false),
  ('spider-curl', 'Spider Curl', '{}'::text[], 'dumbbell', 'strength', false),
  ('close-grip-bench-press', 'Close-Grip Bench Press', array['cgbp']::text[], 'barbell', 'strength', false),
  ('skullcrusher', 'Skullcrusher', array['lying tricep extension']::text[], 'barbell', 'strength', false),
  ('overhead-tricep-extension', 'Overhead Tricep Extension', '{}'::text[], 'dumbbell', 'strength', false),
  ('tricep-pushdown', 'Tricep Pushdown', array['pushdown']::text[], 'cable', 'strength', false),
  ('rope-pushdown', 'Rope Pushdown', '{}'::text[], 'cable', 'strength', false),
  ('tricep-kickback', 'Tricep Kickback', '{}'::text[], 'dumbbell', 'strength', true),
  ('bench-dip', 'Bench Dip', '{}'::text[], 'bodyweight', 'strength', false),
  ('tricep-dip', 'Tricep Dip', '{}'::text[], 'bodyweight', 'strength', false),
  ('diamond-push-up', 'Diamond Push-Up', '{}'::text[], 'bodyweight', 'strength', false),
  ('wrist-curl', 'Wrist Curl', '{}'::text[], 'dumbbell', 'strength', false),
  ('reverse-wrist-curl', 'Reverse Wrist Curl', '{}'::text[], 'dumbbell', 'strength', false),
  ('farmers-walk', 'Farmer''s Walk', array['farmers carry']::text[], 'dumbbell', 'strength', false),
  ('reverse-curl', 'Reverse Curl', '{}'::text[], 'barbell', 'strength', false),
  ('back-squat', 'Back Squat', array['squat']::text[], 'barbell', 'strength', false),
  ('front-squat', 'Front Squat', '{}'::text[], 'barbell', 'strength', false),
  ('goblet-squat', 'Goblet Squat', '{}'::text[], 'dumbbell', 'strength', false),
  ('hack-squat', 'Hack Squat', '{}'::text[], 'machine', 'strength', false),
  ('leg-press', 'Leg Press', '{}'::text[], 'machine', 'strength', false),
  ('bulgarian-split-squat', 'Bulgarian Split Squat', array['bss', 'rear foot elevated split squat']::text[], 'dumbbell', 'strength', true),
  ('walking-lunge', 'Walking Lunge', array['lunge']::text[], 'dumbbell', 'strength', true),
  ('reverse-lunge', 'Reverse Lunge', '{}'::text[], 'dumbbell', 'strength', true),
  ('step-up', 'Step-Up', '{}'::text[], 'dumbbell', 'strength', true),
  ('romanian-deadlift', 'Romanian Deadlift', array['rdl']::text[], 'barbell', 'strength', false),
  ('stiff-leg-deadlift', 'Stiff-Leg Deadlift', '{}'::text[], 'barbell', 'strength', false),
  ('good-morning', 'Good Morning', '{}'::text[], 'barbell', 'strength', false),
  ('leg-extension', 'Leg Extension', '{}'::text[], 'machine', 'strength', false),
  ('lying-leg-curl', 'Lying Leg Curl', array['hamstring curl']::text[], 'machine', 'strength', false),
  ('seated-leg-curl', 'Seated Leg Curl', '{}'::text[], 'machine', 'strength', false),
  ('nordic-curl', 'Nordic Curl', '{}'::text[], 'bodyweight', 'strength', false),
  ('hip-thrust', 'Hip Thrust', '{}'::text[], 'barbell', 'strength', false),
  ('glute-bridge', 'Glute Bridge', '{}'::text[], 'bodyweight', 'strength', false),
  ('cable-kickback', 'Cable Kickback', '{}'::text[], 'cable', 'strength', true),
  ('standing-calf-raise', 'Standing Calf Raise', array['calf raise']::text[], 'machine', 'strength', false),
  ('seated-calf-raise', 'Seated Calf Raise', '{}'::text[], 'machine', 'strength', false),
  ('adductor-machine', 'Adductor Machine', array['hip adduction']::text[], 'machine', 'strength', false),
  ('abductor-machine', 'Abductor Machine', array['hip abduction']::text[], 'machine', 'strength', false),
  ('plank', 'Plank', '{}'::text[], 'bodyweight', 'strength', false),
  ('side-plank', 'Side Plank', '{}'::text[], 'bodyweight', 'strength', true),
  ('hanging-leg-raise', 'Hanging Leg Raise', '{}'::text[], 'bodyweight', 'strength', false),
  ('hanging-knee-raise', 'Hanging Knee Raise', '{}'::text[], 'bodyweight', 'strength', false),
  ('cable-crunch', 'Cable Crunch', '{}'::text[], 'cable', 'strength', false),
  ('crunch', 'Crunch', '{}'::text[], 'bodyweight', 'strength', false),
  ('sit-up', 'Sit-Up', '{}'::text[], 'bodyweight', 'strength', false),
  ('russian-twist', 'Russian Twist', '{}'::text[], 'bodyweight', 'strength', false),
  ('ab-wheel-rollout', 'Ab Wheel Rollout', '{}'::text[], 'other', 'strength', false),
  ('dead-bug', 'Dead Bug', '{}'::text[], 'bodyweight', 'strength', false),
  ('mountain-climber', 'Mountain Climber', '{}'::text[], 'bodyweight', 'strength', false),
  ('pallof-press', 'Pallof Press', '{}'::text[], 'cable', 'strength', true),
  ('treadmill-run', 'Treadmill Run', array['running', 'run']::text[], 'machine', 'cardio', false),
  ('stationary-bike', 'Stationary Bike', array['cycling', 'bike']::text[], 'machine', 'cardio', false),
  ('rowing-machine', 'Rowing Machine', array['erg', 'rower']::text[], 'machine', 'cardio', false),
  ('elliptical', 'Elliptical', '{}'::text[], 'machine', 'cardio', false),
  ('stair-climber', 'Stair Climber', '{}'::text[], 'machine', 'cardio', false),
  ('jump-rope', 'Jump Rope', array['skipping']::text[], 'other', 'cardio', false),
  ('arm-circles', 'Arm Circles', '{}'::text[], 'bodyweight', 'mobility', false),
  ('band-pass-through', 'Band Pass-Through', '{}'::text[], 'band', 'mobility', false),
  ('scapular-wall-slide', 'Scapular Wall Slide', '{}'::text[], 'bodyweight', 'mobility', false),
  ('cat-cow', 'Cat-Cow', '{}'::text[], 'bodyweight', 'mobility', false),
  ('worlds-greatest-stretch', 'World''s Greatest Stretch', '{}'::text[], 'bodyweight', 'mobility', true),
  ('hip-flexor-stretch', 'Hip Flexor Stretch', '{}'::text[], 'bodyweight', 'mobility', true),
  ('thoracic-rotation', 'Thoracic Rotation', '{}'::text[], 'bodyweight', 'mobility', true),
  ('leg-swing', 'Leg Swing', '{}'::text[], 'bodyweight', 'mobility', true)
on conflict (slug) do update set
  name = excluded.name, aliases = excluded.aliases,
  equipment = excluded.equipment, type = excluded.type,
  is_unilateral = excluded.is_unilateral;

-- Mappings are replaced wholesale rather than upserted, so a muscle removed
-- from an exercise in the source file is actually removed here.
delete from hadid.exercise_muscles em
using hadid.exercises e
where e.id = em.exercise_id and e.slug is not null;

insert into hadid.exercise_muscles (exercise_id, muscle_group_id, role, activation)
select e.id, v.muscle_group_id, v.role, v.activation
from (values
  ('barbell-bench-press', 'chest', 'primary', 1.00),
  ('barbell-bench-press', 'front_delts', 'secondary', 0.50),
  ('barbell-bench-press', 'triceps', 'secondary', 0.50),
  ('incline-barbell-bench-press', 'chest', 'primary', 0.90),
  ('incline-barbell-bench-press', 'front_delts', 'secondary', 0.60),
  ('incline-barbell-bench-press', 'triceps', 'secondary', 0.40),
  ('decline-barbell-bench-press', 'chest', 'primary', 0.90),
  ('decline-barbell-bench-press', 'triceps', 'secondary', 0.50),
  ('dumbbell-bench-press', 'chest', 'primary', 1.00),
  ('dumbbell-bench-press', 'front_delts', 'secondary', 0.50),
  ('dumbbell-bench-press', 'triceps', 'secondary', 0.40),
  ('incline-dumbbell-press', 'chest', 'primary', 0.90),
  ('incline-dumbbell-press', 'front_delts', 'secondary', 0.60),
  ('incline-dumbbell-press', 'triceps', 'secondary', 0.40),
  ('decline-dumbbell-press', 'chest', 'primary', 0.90),
  ('decline-dumbbell-press', 'triceps', 'secondary', 0.40),
  ('dumbbell-fly', 'chest', 'primary', 1.00),
  ('dumbbell-fly', 'front_delts', 'secondary', 0.30),
  ('incline-dumbbell-fly', 'chest', 'primary', 0.90),
  ('incline-dumbbell-fly', 'front_delts', 'secondary', 0.40),
  ('cable-fly', 'chest', 'primary', 1.00),
  ('cable-fly', 'front_delts', 'secondary', 0.30),
  ('cable-crossover', 'chest', 'primary', 1.00),
  ('cable-crossover', 'front_delts', 'secondary', 0.30),
  ('machine-chest-press', 'chest', 'primary', 1.00),
  ('machine-chest-press', 'triceps', 'secondary', 0.40),
  ('machine-chest-press', 'front_delts', 'secondary', 0.40),
  ('pec-deck', 'chest', 'primary', 1.00),
  ('push-up', 'chest', 'primary', 0.90),
  ('push-up', 'triceps', 'secondary', 0.50),
  ('push-up', 'front_delts', 'secondary', 0.40),
  ('push-up', 'abs', 'secondary', 0.30),
  ('chest-dip', 'chest', 'primary', 0.90),
  ('chest-dip', 'triceps', 'secondary', 0.60),
  ('chest-dip', 'front_delts', 'secondary', 0.40),
  ('deadlift', 'lower_back', 'primary', 0.90),
  ('deadlift', 'glutes', 'primary', 0.90),
  ('deadlift', 'hamstrings', 'primary', 0.90),
  ('deadlift', 'traps', 'secondary', 0.50),
  ('deadlift', 'lats', 'secondary', 0.40),
  ('deadlift', 'forearms', 'secondary', 0.40),
  ('deadlift', 'quads', 'secondary', 0.40),
  ('sumo-deadlift', 'glutes', 'primary', 0.90),
  ('sumo-deadlift', 'quads', 'primary', 0.70),
  ('sumo-deadlift', 'hamstrings', 'secondary', 0.60),
  ('sumo-deadlift', 'lower_back', 'secondary', 0.60),
  ('sumo-deadlift', 'adductors', 'secondary', 0.50),
  ('sumo-deadlift', 'traps', 'secondary', 0.40),
  ('rack-pull', 'lower_back', 'primary', 0.80),
  ('rack-pull', 'traps', 'primary', 0.70),
  ('rack-pull', 'glutes', 'secondary', 0.60),
  ('rack-pull', 'lats', 'secondary', 0.40),
  ('rack-pull', 'forearms', 'secondary', 0.40),
  ('barbell-row', 'lats', 'primary', 0.90),
  ('barbell-row', 'rhomboids', 'primary', 0.70),
  ('barbell-row', 'traps', 'secondary', 0.50),
  ('barbell-row', 'rear_delts', 'secondary', 0.50),
  ('barbell-row', 'biceps', 'secondary', 0.40),
  ('barbell-row', 'lower_back', 'secondary', 0.40),
  ('pendlay-row', 'lats', 'primary', 0.90),
  ('pendlay-row', 'rhomboids', 'primary', 0.70),
  ('pendlay-row', 'traps', 'secondary', 0.50),
  ('pendlay-row', 'rear_delts', 'secondary', 0.40),
  ('pendlay-row', 'biceps', 'secondary', 0.40),
  ('dumbbell-row', 'lats', 'primary', 1.00),
  ('dumbbell-row', 'rhomboids', 'secondary', 0.60),
  ('dumbbell-row', 'rear_delts', 'secondary', 0.40),
  ('dumbbell-row', 'biceps', 'secondary', 0.40),
  ('t-bar-row', 'lats', 'primary', 0.90),
  ('t-bar-row', 'rhomboids', 'primary', 0.70),
  ('t-bar-row', 'traps', 'secondary', 0.50),
  ('t-bar-row', 'biceps', 'secondary', 0.40),
  ('chest-supported-row', 'rhomboids', 'primary', 0.90),
  ('chest-supported-row', 'lats', 'primary', 0.80),
  ('chest-supported-row', 'rear_delts', 'secondary', 0.50),
  ('chest-supported-row', 'biceps', 'secondary', 0.40),
  ('seated-cable-row', 'lats', 'primary', 0.90),
  ('seated-cable-row', 'rhomboids', 'primary', 0.70),
  ('seated-cable-row', 'biceps', 'secondary', 0.40),
  ('seated-cable-row', 'rear_delts', 'secondary', 0.40),
  ('machine-row', 'lats', 'primary', 0.90),
  ('machine-row', 'rhomboids', 'secondary', 0.60),
  ('machine-row', 'biceps', 'secondary', 0.40),
  ('lat-pulldown', 'lats', 'primary', 1.00),
  ('lat-pulldown', 'biceps', 'secondary', 0.50),
  ('lat-pulldown', 'rhomboids', 'secondary', 0.40),
  ('close-grip-lat-pulldown', 'lats', 'primary', 1.00),
  ('close-grip-lat-pulldown', 'biceps', 'secondary', 0.50),
  ('pull-up', 'lats', 'primary', 1.00),
  ('pull-up', 'biceps', 'secondary', 0.50),
  ('pull-up', 'rhomboids', 'secondary', 0.40),
  ('pull-up', 'abs', 'secondary', 0.30),
  ('chin-up', 'lats', 'primary', 0.90),
  ('chin-up', 'biceps', 'primary', 0.70),
  ('chin-up', 'abs', 'secondary', 0.30),
  ('straight-arm-pulldown', 'lats', 'primary', 1.00),
  ('straight-arm-pulldown', 'triceps', 'secondary', 0.30),
  ('barbell-shrug', 'traps', 'primary', 1.00),
  ('barbell-shrug', 'forearms', 'secondary', 0.40),
  ('dumbbell-shrug', 'traps', 'primary', 1.00),
  ('dumbbell-shrug', 'forearms', 'secondary', 0.40),
  ('face-pull', 'rear_delts', 'primary', 1.00),
  ('face-pull', 'rhomboids', 'secondary', 0.60),
  ('face-pull', 'traps', 'secondary', 0.40),
  ('back-extension', 'lower_back', 'primary', 1.00),
  ('back-extension', 'glutes', 'secondary', 0.60),
  ('back-extension', 'hamstrings', 'secondary', 0.50),
  ('overhead-press', 'front_delts', 'primary', 1.00),
  ('overhead-press', 'side_delts', 'secondary', 0.50),
  ('overhead-press', 'triceps', 'secondary', 0.50),
  ('overhead-press', 'abs', 'secondary', 0.30),
  ('seated-dumbbell-shoulder-press', 'front_delts', 'primary', 1.00),
  ('seated-dumbbell-shoulder-press', 'side_delts', 'secondary', 0.50),
  ('seated-dumbbell-shoulder-press', 'triceps', 'secondary', 0.40),
  ('arnold-press', 'front_delts', 'primary', 1.00),
  ('arnold-press', 'side_delts', 'secondary', 0.60),
  ('arnold-press', 'triceps', 'secondary', 0.40),
  ('machine-shoulder-press', 'front_delts', 'primary', 1.00),
  ('machine-shoulder-press', 'side_delts', 'secondary', 0.40),
  ('machine-shoulder-press', 'triceps', 'secondary', 0.40),
  ('push-press', 'front_delts', 'primary', 0.90),
  ('push-press', 'triceps', 'secondary', 0.50),
  ('push-press', 'quads', 'secondary', 0.40),
  ('push-press', 'abs', 'secondary', 0.30),
  ('lateral-raise', 'side_delts', 'primary', 1.00),
  ('lateral-raise', 'traps', 'secondary', 0.30),
  ('cable-lateral-raise', 'side_delts', 'primary', 1.00),
  ('front-raise', 'front_delts', 'primary', 1.00),
  ('rear-delt-fly', 'rear_delts', 'primary', 1.00),
  ('rear-delt-fly', 'rhomboids', 'secondary', 0.50),
  ('reverse-pec-deck', 'rear_delts', 'primary', 1.00),
  ('reverse-pec-deck', 'rhomboids', 'secondary', 0.50),
  ('upright-row', 'side_delts', 'primary', 0.90),
  ('upright-row', 'traps', 'primary', 0.70),
  ('upright-row', 'biceps', 'secondary', 0.30),
  ('barbell-curl', 'biceps', 'primary', 1.00),
  ('barbell-curl', 'forearms', 'secondary', 0.40),
  ('ez-bar-curl', 'biceps', 'primary', 1.00),
  ('ez-bar-curl', 'forearms', 'secondary', 0.40),
  ('dumbbell-curl', 'biceps', 'primary', 1.00),
  ('dumbbell-curl', 'forearms', 'secondary', 0.40),
  ('hammer-curl', 'biceps', 'primary', 0.90),
  ('hammer-curl', 'forearms', 'primary', 0.70),
  ('incline-dumbbell-curl', 'biceps', 'primary', 1.00),
  ('incline-dumbbell-curl', 'forearms', 'secondary', 0.30),
  ('preacher-curl', 'biceps', 'primary', 1.00),
  ('preacher-curl', 'forearms', 'secondary', 0.30),
  ('concentration-curl', 'biceps', 'primary', 1.00),
  ('cable-curl', 'biceps', 'primary', 1.00),
  ('cable-curl', 'forearms', 'secondary', 0.30),
  ('spider-curl', 'biceps', 'primary', 1.00),
  ('close-grip-bench-press', 'triceps', 'primary', 1.00),
  ('close-grip-bench-press', 'chest', 'secondary', 0.60),
  ('close-grip-bench-press', 'front_delts', 'secondary', 0.40),
  ('skullcrusher', 'triceps', 'primary', 1.00),
  ('overhead-tricep-extension', 'triceps', 'primary', 1.00),
  ('tricep-pushdown', 'triceps', 'primary', 1.00),
  ('rope-pushdown', 'triceps', 'primary', 1.00),
  ('tricep-kickback', 'triceps', 'primary', 1.00),
  ('bench-dip', 'triceps', 'primary', 1.00),
  ('bench-dip', 'chest', 'secondary', 0.40),
  ('bench-dip', 'front_delts', 'secondary', 0.30),
  ('tricep-dip', 'triceps', 'primary', 1.00),
  ('tricep-dip', 'chest', 'secondary', 0.50),
  ('diamond-push-up', 'triceps', 'primary', 0.90),
  ('diamond-push-up', 'chest', 'secondary', 0.60),
  ('wrist-curl', 'forearms', 'primary', 1.00),
  ('reverse-wrist-curl', 'forearms', 'primary', 1.00),
  ('farmers-walk', 'forearms', 'primary', 1.00),
  ('farmers-walk', 'traps', 'secondary', 0.60),
  ('farmers-walk', 'abs', 'secondary', 0.40),
  ('farmers-walk', 'glutes', 'secondary', 0.30),
  ('reverse-curl', 'forearms', 'primary', 0.90),
  ('reverse-curl', 'biceps', 'secondary', 0.60),
  ('back-squat', 'quads', 'primary', 1.00),
  ('back-squat', 'glutes', 'primary', 0.80),
  ('back-squat', 'hamstrings', 'secondary', 0.50),
  ('back-squat', 'lower_back', 'secondary', 0.40),
  ('back-squat', 'abs', 'secondary', 0.40),
  ('back-squat', 'adductors', 'secondary', 0.40),
  ('front-squat', 'quads', 'primary', 1.00),
  ('front-squat', 'glutes', 'secondary', 0.60),
  ('front-squat', 'abs', 'secondary', 0.50),
  ('front-squat', 'lower_back', 'secondary', 0.40),
  ('goblet-squat', 'quads', 'primary', 0.90),
  ('goblet-squat', 'glutes', 'secondary', 0.60),
  ('goblet-squat', 'abs', 'secondary', 0.40),
  ('hack-squat', 'quads', 'primary', 1.00),
  ('hack-squat', 'glutes', 'secondary', 0.50),
  ('leg-press', 'quads', 'primary', 1.00),
  ('leg-press', 'glutes', 'secondary', 0.60),
  ('leg-press', 'hamstrings', 'secondary', 0.40),
  ('bulgarian-split-squat', 'quads', 'primary', 0.90),
  ('bulgarian-split-squat', 'glutes', 'primary', 0.90),
  ('bulgarian-split-squat', 'hamstrings', 'secondary', 0.40),
  ('bulgarian-split-squat', 'adductors', 'secondary', 0.30),
  ('walking-lunge', 'quads', 'primary', 0.90),
  ('walking-lunge', 'glutes', 'primary', 0.80),
  ('walking-lunge', 'hamstrings', 'secondary', 0.40),
  ('reverse-lunge', 'glutes', 'primary', 0.90),
  ('reverse-lunge', 'quads', 'primary', 0.70),
  ('reverse-lunge', 'hamstrings', 'secondary', 0.40),
  ('step-up', 'quads', 'primary', 0.90),
  ('step-up', 'glutes', 'primary', 0.80),
  ('romanian-deadlift', 'hamstrings', 'primary', 1.00),
  ('romanian-deadlift', 'glutes', 'primary', 0.80),
  ('romanian-deadlift', 'lower_back', 'secondary', 0.60),
  ('romanian-deadlift', 'forearms', 'secondary', 0.30),
  ('stiff-leg-deadlift', 'hamstrings', 'primary', 1.00),
  ('stiff-leg-deadlift', 'glutes', 'primary', 0.70),
  ('stiff-leg-deadlift', 'lower_back', 'secondary', 0.60),
  ('good-morning', 'hamstrings', 'primary', 0.90),
  ('good-morning', 'lower_back', 'primary', 0.80),
  ('good-morning', 'glutes', 'secondary', 0.60),
  ('leg-extension', 'quads', 'primary', 1.00),
  ('lying-leg-curl', 'hamstrings', 'primary', 1.00),
  ('lying-leg-curl', 'calves', 'secondary', 0.30),
  ('seated-leg-curl', 'hamstrings', 'primary', 1.00),
  ('nordic-curl', 'hamstrings', 'primary', 1.00),
  ('nordic-curl', 'glutes', 'secondary', 0.40),
  ('hip-thrust', 'glutes', 'primary', 1.00),
  ('hip-thrust', 'hamstrings', 'secondary', 0.50),
  ('glute-bridge', 'glutes', 'primary', 1.00),
  ('glute-bridge', 'hamstrings', 'secondary', 0.40),
  ('cable-kickback', 'glutes', 'primary', 1.00),
  ('standing-calf-raise', 'calves', 'primary', 1.00),
  ('seated-calf-raise', 'calves', 'primary', 1.00),
  ('adductor-machine', 'adductors', 'primary', 1.00),
  ('abductor-machine', 'glutes', 'primary', 0.90),
  ('plank', 'abs', 'primary', 1.00),
  ('plank', 'obliques', 'secondary', 0.50),
  ('plank', 'lower_back', 'secondary', 0.30),
  ('side-plank', 'obliques', 'primary', 1.00),
  ('side-plank', 'abs', 'secondary', 0.50),
  ('hanging-leg-raise', 'abs', 'primary', 1.00),
  ('hanging-leg-raise', 'obliques', 'secondary', 0.40),
  ('hanging-leg-raise', 'forearms', 'secondary', 0.30),
  ('hanging-knee-raise', 'abs', 'primary', 1.00),
  ('hanging-knee-raise', 'forearms', 'secondary', 0.30),
  ('cable-crunch', 'abs', 'primary', 1.00),
  ('cable-crunch', 'obliques', 'secondary', 0.30),
  ('crunch', 'abs', 'primary', 1.00),
  ('sit-up', 'abs', 'primary', 1.00),
  ('sit-up', 'obliques', 'secondary', 0.30),
  ('russian-twist', 'obliques', 'primary', 1.00),
  ('russian-twist', 'abs', 'secondary', 0.60),
  ('ab-wheel-rollout', 'abs', 'primary', 1.00),
  ('ab-wheel-rollout', 'lats', 'secondary', 0.40),
  ('ab-wheel-rollout', 'lower_back', 'secondary', 0.30),
  ('dead-bug', 'abs', 'primary', 1.00),
  ('mountain-climber', 'abs', 'primary', 0.90),
  ('mountain-climber', 'obliques', 'secondary', 0.50),
  ('mountain-climber', 'front_delts', 'secondary', 0.30),
  ('pallof-press', 'obliques', 'primary', 1.00),
  ('pallof-press', 'abs', 'secondary', 0.60),
  ('treadmill-run', 'quads', 'secondary', 0.60),
  ('treadmill-run', 'calves', 'secondary', 0.60),
  ('treadmill-run', 'hamstrings', 'secondary', 0.50),
  ('treadmill-run', 'glutes', 'secondary', 0.40),
  ('stationary-bike', 'quads', 'primary', 0.70),
  ('stationary-bike', 'glutes', 'secondary', 0.40),
  ('stationary-bike', 'calves', 'secondary', 0.30),
  ('rowing-machine', 'lats', 'secondary', 0.60),
  ('rowing-machine', 'quads', 'secondary', 0.50),
  ('rowing-machine', 'rhomboids', 'secondary', 0.40),
  ('rowing-machine', 'biceps', 'secondary', 0.30),
  ('elliptical', 'quads', 'secondary', 0.50),
  ('elliptical', 'glutes', 'secondary', 0.40),
  ('elliptical', 'calves', 'secondary', 0.30),
  ('stair-climber', 'glutes', 'primary', 0.70),
  ('stair-climber', 'quads', 'secondary', 0.60),
  ('stair-climber', 'calves', 'secondary', 0.40),
  ('jump-rope', 'calves', 'primary', 0.80),
  ('jump-rope', 'quads', 'secondary', 0.40),
  ('arm-circles', 'front_delts', 'secondary', 0.40),
  ('arm-circles', 'side_delts', 'secondary', 0.40),
  ('arm-circles', 'rear_delts', 'secondary', 0.30),
  ('band-pass-through', 'front_delts', 'secondary', 0.40),
  ('band-pass-through', 'rear_delts', 'secondary', 0.40),
  ('band-pass-through', 'traps', 'secondary', 0.30),
  ('scapular-wall-slide', 'rhomboids', 'secondary', 0.50),
  ('scapular-wall-slide', 'traps', 'secondary', 0.40),
  ('scapular-wall-slide', 'rear_delts', 'secondary', 0.30),
  ('cat-cow', 'lower_back', 'secondary', 0.40),
  ('cat-cow', 'abs', 'secondary', 0.30),
  ('worlds-greatest-stretch', 'adductors', 'secondary', 0.40),
  ('worlds-greatest-stretch', 'glutes', 'secondary', 0.40),
  ('worlds-greatest-stretch', 'obliques', 'secondary', 0.30),
  ('hip-flexor-stretch', 'quads', 'secondary', 0.30),
  ('hip-flexor-stretch', 'glutes', 'secondary', 0.30),
  ('thoracic-rotation', 'obliques', 'secondary', 0.40),
  ('thoracic-rotation', 'lower_back', 'secondary', 0.30),
  ('leg-swing', 'hamstrings', 'secondary', 0.30),
  ('leg-swing', 'glutes', 'secondary', 0.30),
  ('leg-swing', 'adductors', 'secondary', 0.30)
) as v(slug, muscle_group_id, role, activation)
join hadid.exercises e on e.slug = v.slug
on conflict (exercise_id, muscle_group_id) do update set
  role = excluded.role, activation = excluded.activation;

-- Badge definitions
insert into hadid.achievements (id, category, name, description, metric, threshold, sort_order) values
  ('first_rep', 'milestones', 'First Rep', 'Finish your first workout.', 'workouts_count', 1, 1),
  ('getting_serious', 'milestones', 'Getting Serious', 'Finish 5 workouts.', 'workouts_count', 5, 2),
  ('gym_regular', 'milestones', 'Gym Regular', 'Finish 25 workouts.', 'workouts_count', 25, 3),
  ('century_club', 'milestones', 'Century Club', 'Finish 100 workouts.', 'workouts_count', 100, 4),
  ('iron_veteran', 'milestones', 'Iron Veteran', 'Finish 250 workouts.', 'workouts_count', 250, 5),
  ('week_warrior', 'milestones', 'Week Warrior', 'Train 7 days in a row.', 'streak_days', 7, 6),
  ('month_strong', 'milestones', 'Month Strong', 'Hold a 30-day streak.', 'streak_days', 30, 7),
  ('unbreakable', 'milestones', 'Unbreakable', 'Hold a 100-day streak.', 'streak_days', 100, 8),
  ('set_stacker', 'volume', 'Set Stacker', 'Log 100 working sets.', 'sets_count', 100, 1),
  ('set_legend', 'volume', 'Set Legend', 'Log 500 working sets.', 'sets_count', 500, 2),
  ('rep_machine', 'volume', 'Rep Machine', 'Log 2,000 working sets.', 'sets_count', 2000, 3),
  ('set_immortal', 'volume', 'Set Immortal', 'Log 5,000 working sets.', 'sets_count', 5000, 4),
  ('volume_machine', 'volume', 'Volume Machine', 'Move 10,000 kg in total.', 'total_volume_kg', 10000, 5),
  ('ton_lifter', 'volume', 'Ton Lifter', 'Move 50,000 kg in total.', 'total_volume_kg', 50000, 6),
  ('heavy_hauler', 'volume', 'Heavy Hauler', 'Move 250,000 kg in total.', 'total_volume_kg', 250000, 7),
  ('mountain_mover', 'volume', 'Mountain Mover', 'Move 1,000,000 kg in total.', 'total_volume_kg', 1000000, 8),
  ('record_breaker', 'strength', 'Record Breaker', 'Set your first personal record.', 'pr_count', 1, 1),
  ('pr_hunter', 'strength', 'PR Hunter', 'Set 5 personal records.', 'pr_count', 5, 2),
  ('record_machine', 'strength', 'Record Machine', 'Set 15 personal records.', 'pr_count', 15, 3),
  ('pr_collector', 'strength', 'PR Collector', 'Set 30 personal records.', 'pr_count', 30, 4),
  ('relentless', 'strength', 'Relentless', 'Set 60 personal records.', 'pr_count', 60, 5),
  ('pr_addict', 'strength', 'PR Addict', 'Set 100 personal records.', 'pr_count', 100, 6),
  ('iron_will', 'strength', 'Iron Will', 'Set 200 personal records.', 'pr_count', 200, 7),
  ('immortal', 'strength', 'Immortal', 'Set 500 personal records.', 'pr_count', 500, 8)
on conflict (id) do update set
  category = excluded.category, name = excluded.name,
  description = excluded.description,
  metric = excluded.metric, threshold = excluded.threshold,
  sort_order = excluded.sort_order;

commit;
