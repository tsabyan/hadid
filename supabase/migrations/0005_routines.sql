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
