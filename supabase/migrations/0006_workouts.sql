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
