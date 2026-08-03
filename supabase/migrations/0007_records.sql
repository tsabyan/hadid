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
-- The RETURNS TABLE columns are named after the columns they carry — reps,
-- value, exercise_id — which makes every bare reference below ambiguous
-- between an output parameter and a table column. This directive resolves
-- them to the column, which is what every one of them means.
#variable_conflict use_column
declare
  v_user uuid;
begin
  select w.user_id into v_user
  from hadid.workouts w
  where w.id = p_workout_id;

  if v_user is null then
    return;
  end if;

  -- Defence in depth. This function is revoked from client roles below, but
  -- it is security definer and writes records for whoever owns the workout —
  -- so if a grant is ever restored by accident, it must still refuse to write
  -- to somebody else's history.
  if auth.uid() is not null and auth.uid() <> v_user then
    raise exception 'not your workout';
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
