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
-- Same reason as detect_prs: the RETURNS TABLE columns are named after the
-- columns they carry, so `achievement_id`, `name` and `category` are each
-- ambiguous between an output parameter and a real column. Every one of them
-- means the column.
#variable_conflict use_column
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
