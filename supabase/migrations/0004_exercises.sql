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
